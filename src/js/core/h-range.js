'use strict';

// Converts browser Range objects to/from a serializable format so annotations
// can be stored and later re-highlighted even if the DOM has changed.
// serializeRange -> store in DB; normalizeRange -> restore from DB.

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum characters of surrounding text captured as annotation context. */
var CONTEXT_WINDOW_LENGTH = 35;

// ─── Serialization helpers ───────────────────────────────────────────────────

function xpathFromRootToNode(root, node, offset, ignoreSelector) {
  var currentNode = node;
  var xpath = '';
  var totalOffset = offset;

  // this is often the case when highlighting images as <img> nodes do not have a text node child
  if (currentNode === root && root.childNodes[offset].nodeType === Node.TEXT_NODE) {
    currentNode = root.childNodes[offset];
  }
  if (currentNode === root) {
    var actualNode = root.childNodes[offset];
    if (actualNode.nodeType === Node.TEXT_NODE) {
      xpath = "/";

    } else {
      var likeNodesList = root.querySelectorAll(actualNode.nodeName.toLowerCase());
      var likeNodesCounter = 1;
      var found = false;
      var BreakException = {};
      try {
        likeNodesList.forEach(function(node) {
          if (node !== actualNode && node.className.indexOf(ignoreSelector) === -1) {
            likeNodesCounter += 1;
          } else {
            found = true;
            throw BreakException;
          }
        });
      } catch (e) {
        if (e !== BreakException) { throw e;};
      }
      if (found) {
        xpath = "/" + actualNode.nodeName.toLowerCase() + '[' + likeNodesCounter + ']' + xpath;
        totalOffset = 0;
      }
    }
  } else {
    while (currentNode !== null && currentNode !== root) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        var traverseNode = currentNode;
        while ((traverseNode = traverseNode.previousSibling)) {
          totalOffset += traverseNode.textContent.length;
        }
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        if (currentNode.className.indexOf(ignoreSelector) < 0) {
          var nodeCount = 1;
          var currentName = currentNode.nodeName;
          var counterNode = currentNode;
          while ((counterNode = counterNode.previousSibling)) {
            if (counterNode.nodeName === currentName) {
              nodeCount += 1;
            }
          }
          xpath = "/" + currentName.toLowerCase() + '[' + nodeCount + ']' + xpath;
        } else if (currentNode.nodeName === "IMG") {
          // IMG nodes handled by xpath above
        } else {
          traverseNode = currentNode;
          while ((traverseNode = traverseNode.previousSibling)) {
            totalOffset += traverseNode.textContent.length;
          }
        }
      }
      currentNode = currentNode.parentNode;
    }
  }

  if (currentNode != null) {
    if (xpath === "" && totalOffset >= 0) {
      xpath = '/';
    }
    return {
      xpath: xpath,
      offset: totalOffset
    };
  } else {
    return undefined;
  }

}

function getPrefixAndSuffix(range, root, ignoreSelector) {
  var prefixCounterNode = range.startContainer;
  var suffixCounterNode = range.endContainer;
  var prefixOffset = range.startOffset;
  var suffixOffset = range.endOffset;
  if (prefixCounterNode === root) {
    prefixCounterNode = root.childNodes[prefixOffset];
    prefixOffset = 0;
  }
  if (suffixCounterNode === root) {
    suffixCounterNode = root.childNodes[suffixOffset];
    suffixOffset = 0;
  }
  var prefix = prefixCounterNode.textContent.slice(0, prefixOffset);
  var suffix = suffixCounterNode.textContent.slice(suffixOffset);

  while (prefix.length <= CONTEXT_WINDOW_LENGTH && (prefixCounterNode = prefixCounterNode.previousSibling)) {
    prefix = prefixCounterNode.textContent + prefix;
  }

  while (suffix.length <= CONTEXT_WINDOW_LENGTH && (suffixCounterNode = suffixCounterNode.nextSibling)) {
    suffix = suffix + suffixCounterNode.textContent;
  }

  if (prefix.length >= CONTEXT_WINDOW_LENGTH + 1) {
    prefix = prefix.slice(prefix.length - CONTEXT_WINDOW_LENGTH);
  }
  if (suffix.length >= CONTEXT_WINDOW_LENGTH + 1) {
    suffix = suffix.slice(0, CONTEXT_WINDOW_LENGTH);
  }

  return {
    prefix: prefix,
    suffix: suffix
  };
}

function getExactText(range) {
  var exact = (range.toString() === "[object Object]") ? range.exact : range.toString();
  var rangeContents = range.cloneContents();
  var possibleImageList = rangeContents.querySelectorAll('img');
  var rangeContainsImage = possibleImageList.length;
  if (rangeContainsImage) {
    if (typeof(possibleImageList.forEach) !== "function") {
      var convertToArray = [];
      for (var i = possibleImageList.length - 1; i >= 0; i--) {
        convertToArray.push(possibleImageList[i]);
      }
      possibleImageList = convertToArray;
    }

    possibleImageList.forEach(function(im) {
      var indexOfImage = [].slice.call(rangeContents.childNodes).findIndex(function(el) {
        return el === im;
      });
      if (indexOfImage === 0) {
        exact = '[Image: ' + im.alt + ']' + exact;
      } else if (indexOfImage === rangeContents.childNodes.length - 1) {
        exact += '[Image: ' + im.alt + ']';
      } else {
        var prefix = '';
        var prefixCounter = indexOfImage - 1;
        while (prefixCounter >= 0) {
          prefix = rangeContents.childNodes[prefixCounter].textContent + prefix;
          prefixCounter--;
        }

        var suffix = '';
        var suffixCounter = indexOfImage + 1;
        while (suffixCounter < rangeContents.childNodes.length) {
          suffix += rangeContents.childNodes[suffixCounter].textContent;
          suffixCounter++;
        }
        exact = prefix + ' [Image: ' + im.alt + '] ' + suffix;
      }
    });
  }
  return exact.trim();
}

// ─── Serialization — exported ────────────────────────────────────────────────

// general idea came from responses to this question
// https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container
// Computes start/end positions of a selection as raw character counts from the
// beginning of the .annotator-wrapper container. Stored as the "Way 2" fallback
// in serializeRange alongside the XPath data.
function getGlobalOffset(range, root, ignoreSelector) {
  var preRangeRange = document.createRange();
  root = jQuery(root)[0];
  if (root.className.indexOf('annotator-wrapper') === -1) {
    root = root.querySelector('.annotator-wrapper');
  }
  preRangeRange.selectNodeContents(jQuery(root)[0]);
  preRangeRange.setEnd(range.startContainer, range.startOffset);
  return {
    startOffset: preRangeRange.toString().length,
    endOffset: preRangeRange.toString().length + range.toString().length
  };
}

// Takes a live browser Range (a user's text selection) and converts it to a
// plain JSON-serializable object with three parts: xpath (path + char offsets
// to the start/end nodes), text (exact selected text plus up to 35 chars of
// surrounding prefix/suffix context), and position (global char offset from
// the top of the annotatable container as a fallback). This is what gets
// stored in the database when someone makes an annotation.
function serializeRange(range, root, ignoreSelector) {
  root = jQuery(root)[0];
  if (root.className.indexOf('annotator-wrapper') === -1) {
    root = root.querySelector('.annotator-wrapper');
  }
  var _start = range.startContainer;
  var _startOffset = range.startOffset;
  var _end = range.endContainer;
  var _endOffset = range.endOffset;

  var startResult = xpathFromRootToNode(root, _start, _startOffset, ignoreSelector);
  var endResult = xpathFromRootToNode(root, _end, _endOffset, ignoreSelector);
  var prepost = getPrefixAndSuffix(range, root, ignoreSelector);
  var glob = getGlobalOffset(range, root, ignoreSelector);

  var exact = getExactText(range);

  return {
    xpath: {
      start: startResult.xpath,
      startOffset: startResult.offset,
      end: endResult.xpath,
      endOffset: endResult.offset
    },
    text: {
      prefix: prepost.prefix,
      exact: exact,
      suffix: prepost.suffix
    },
    position: {
      globalStartOffset: glob.startOffset,
      globalEndOffset: glob.endOffset
    }
  };
}

// ─── Normalization helpers ────────────────────────────────────────────────────

function findTextNodeAtOffset(root_node, goal_offset) {
  var node_list = root_node.childNodes;
  var goal = goal_offset;
  var currOffset = 0;
  var found = undefined;
  if (goal === 0 && node_list.length === 0) {
    found = {
      node: root_node,
      offset: 0
    };
  }

  for (var i = 0; i < node_list.length; i++) {
    var node = node_list[i];
    if (node.textContent.length + currOffset >= goal) {
      if (node.nodeType !== Node.TEXT_NODE) {
        found = findTextNodeAtOffset(node, goal - currOffset);
        break;
      } else {
        found = {
          node: node,
          offset: goal - currOffset
        };
        break;
      }
    } else {
      currOffset += node.textContent.length;
    }
  };
  return found;
}

function compareExactText(text1, text2) {
  function getDiff(string, diffBy) {
    return string.split(diffBy).join('');
  }
  const res1 = getDiff(text1, text2);
  const res2 = getDiff(text2, text1);
  return text1 === text2 || res1.trim().length === 0 || res2.trim().length === 0;
}

// https://stackoverflow.com/questions/3410464/how-to-find-indices-of-all-occurrences-of-one-string-in-another-in-javascript
function getIndicesOf(searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length;
  if (searchStrLen === 0) {
    return [];
  }
  var startIndex = 0, index, indices = [];
  if (!caseSensitive) {
    str = str.toLowerCase();
    searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchStrLen;
  }
  return indices;
}

// ─── Normalization — exported ─────────────────────────────────────────────────

// Walks a stored XPath string back down the DOM tree to find the specific
// element node, then uses character counting (findTextNodeAtOffset) to
// find the exact text node and offset within it. This is how "Way 1" in
// normalizeRange resolves a stored annotation back to a live DOM position.
function getNodeFromXpath(root, xpath, offset, ignoreSelector) {
  var tree = xpath.replace(/\/text\(\)\[(.*)\]/g, '').split('/');
  tree = tree.filter(function(it) { return it.length > 0; });
  var traversingDown = root;
  tree.forEach(function(it) {
    var selector = it.replace(/\[.*\]/g, '');
    var counter = parseInt(it.replace(/.*?\[(.*)\]/g, '$1'), 10) - 1;

    var foundNodes = Array.prototype.filter.call(traversingDown.children, function(el1) {
      return el1.matches(selector);
    });
    foundNodes = [].slice.call(foundNodes).filter(function(node) {
      return node.className.indexOf(ignoreSelector) === -1;
    });
    if (isNaN(counter) || counter < 0) {
      counter = 0;
      traversingDown = foundNodes[counter];
      while (traversingDown.className.indexOf(ignoreSelector) > -1) {
        traversingDown = foundNodes[++counter];
      }
    } else if (!foundNodes || foundNodes.length === 0) {
      // should account for missing html elements without affecting text
    } else {
      traversingDown = foundNodes[counter];
      while (traversingDown.className.indexOf(ignoreSelector) > -1) {
        traversingDown = foundNodes[++counter];
      }
    }
  });
  var found = findTextNodeAtOffset(traversingDown, offset);
  return found;
}

// Inverse of serializeRange — takes a stored annotation and reconstructs a
// live browser Range so the annotation can be highlighted on screen. Tries
// three strategies in order, falling back if the previous one fails:
//   Way 1: follow the XPath to find the exact node
//   Way 2: if the XPath text doesn't match (e.g. tags renamed), fall back to
//           the global character offset
//   Way 3: if that also fails (e.g. text inserted before the annotation),
//           search the whole document for the exact quote and match by
//           prefix/suffix context
function normalizeRange(serializedRange, root, ignoreSelector) {
  root = jQuery(root)[0];
  if (root.className.indexOf('annotator-wrapper') === -1) {
    root = root.querySelector('.annotator-wrapper');
  }
  var xpathData = serializedRange.xpath ? serializedRange.xpath : serializedRange;
  var _start = xpathData.start;
  var _end = xpathData.end;
  var _startOffset = xpathData.startOffset;
  var _endOffset = xpathData.endOffset;

  // Way #1: Given an xpath, find the way to the node
  var startResult = getNodeFromXpath(root, _start, _startOffset, ignoreSelector);
  var endResult = getNodeFromXpath(root, _end, _endOffset, ignoreSelector);
  if (startResult && endResult) {
    var normalizedRange = document.createRange();
    normalizedRange.setStart(startResult.node, startResult.offset);
    normalizedRange.setEnd(endResult.node, endResult.offset);
  }

  // Way #2: if that doesn't match what we have stored as the quote, try global positioning from root
  // This is for the usecase where someone has changed tagnames so xpath cannot be found
  if (!(startResult && endResult) || (serializedRange.text.exact && !compareExactText(getExactText(normalizedRange), serializedRange.text.exact))) {
    startResult = findTextNodeAtOffset(root, serializedRange.position.globalStartOffset);
    endResult = findTextNodeAtOffset(root, serializedRange.position.globalEndOffset);

    normalizedRange = document.createRange();
    normalizedRange.setStart(startResult.node, startResult.offset);
    normalizedRange.setEnd(endResult.node, endResult.offset);
  }

  // Way #3: looks for an exact match of prefix, suffix, and exact
  // This is for the usecase where someone has added text/html before this
  if (serializedRange.text.exact && !compareExactText(getExactText(normalizedRange), serializedRange.text.exact)) {
    var possibleCases = getIndicesOf(serializedRange.text.exact, root.textContent, true);

    for (var i = 0; i < possibleCases.length; i++) {
      var poss = possibleCases[i];
      var s = findTextNodeAtOffset(root, poss);
      var e = findTextNodeAtOffset(root, poss + serializedRange.text.exact.length);

      normalizedRange = document.createRange();
      normalizedRange.setStart(s.node, s.offset);
      normalizedRange.setEnd(e.node, e.offset);

      var toCheck = getPrefixAndSuffix(normalizedRange, root, ignoreSelector);
      if (serializedRange.text.prefix === toCheck.prefix && serializedRange.text.suffix === toCheck.suffix) {
        break;
      }
    }
  }

  return normalizedRange;
}

// ─── Text node extraction helpers ────────────────────────────────────────────

function extractRangeNodes(currentNode, range) {
  var foundEnd = false;
  var nodeList = [];
  if (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      if (currentNode === range.startContainer) {
        currentNode = currentNode.splitText(range.startOffset);
      }
      if (currentNode === range.endContainer) {
        foundEnd = true;
        currentNode.splitText(range.endOffset);
      }

      if ((range.startContainer === range.endContainer && range.startOffset === range.endOffset)) {
        foundEnd = true;
      }
      nodeList.push(currentNode);
    } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.nodeName === "IMG") {
      if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.childNodes.length < range.startOffset) {
        var possibleStartNode = range.startContainer.childNodes[range.startOffset];
        if (possibleStartNode === currentNode) {
          nodeList.push(currentNode);
          if (range.startContainer === range.endContainer && range.endOffset - range.startOffset === 1) {
            foundEnd = true;
          }
        }
      } else if (!foundEnd && range.endContainer.nodeType === Node.ELEMENT_NODE && range.endContainer.childNodes.length < range.endOffset) {
        var possibleEndNode = range.endContainer.childNodes[range.endOffset];
        if (possibleEndNode === currentNode) {
          foundEnd = true;
          nodeList.push(currentNode);
        }
      } else {
        foundEnd = false;
        nodeList.push(currentNode);
      }
    } else {
      if (currentNode.firstChild) {
        var result = collectTextNodesInRange(currentNode.firstChild, range);
        foundEnd = result.foundEnd;
        nodeList = nodeList.concat(result.nodes);
      }
    }
  }
  return {
    foundEnd: foundEnd,
    nodes: nodeList,
    currentNode: currentNode
  };
}

function collectTextNodesInRange(currentNode, range) {
  var nodeList = [];
  var foundEnd = false;
  var originalNode = currentNode;
  var result = extractRangeNodes(currentNode, range);
  currentNode = result.currentNode;
  if (!foundEnd) {
    foundEnd = result.foundEnd;
  }
  nodeList = nodeList.concat(result.nodes);
  while (!foundEnd && originalNode && ((currentNode = currentNode.nextSibling) !== null)) {
    var res = extractRangeNodes(currentNode, range);
    if (!foundEnd) {
      foundEnd = res.foundEnd;
    }
    nodeList = nodeList.concat(res.nodes);
  }
  if (!foundEnd && originalNode) {
    currentNode = originalNode;
    while (!currentNode.parentNode.nextSibling) {
      currentNode = currentNode.parentNode;
    }
    currentNode = currentNode.parentNode.nextSibling;
    res = collectTextNodesInRange(currentNode, range);
    if (!foundEnd) {
      foundEnd = res.foundEnd;
    }
    nodeList = nodeList.concat(res.nodes);
  }
  return {
    foundEnd: foundEnd,
    nodes: nodeList
  };
}

// ─── Text node extraction — exported ─────────────────────────────────────────

// Given a list of stored annotation range objects, normalizes each one back to
// a live Range then walks the DOM to collect all individual text nodes that
// fall within that range. Used by drawers to know which text nodes to wrap in
// highlight <span> elements when rendering annotations on screen.
function getTextNodesFromAnnotationRanges(ranges, root) {
  var textNodesList = [];

  ranges.forEach(function(range) {
    var normRanged = normalizeRange(range, root, 'annotator-hl');
    var nodes = collectTextNodesInRange(normRanged.startContainer, normRanged);
    textNodesList = textNodesList.concat(nodes.nodes);
  });

  return textNodesList;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.serializeRange = serializeRange;
exports.normalizeRange = normalizeRange;
exports.getGlobalOffset = getGlobalOffset;
exports.getTextNodesFromAnnotationRanges = getTextNodesFromAnnotationRanges;
exports.getNodeFromXpath = getNodeFromXpath;
exports.compareExactText = compareExactText;
exports.getIndicesOf = getIndicesOf;
