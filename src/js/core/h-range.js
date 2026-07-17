'use strict';

// Converts browser Range objects to/from a serializable format so annotations
// can be stored and later re-highlighted even if the DOM has changed.
// serializeRange -> store in DB; normalizeRange -> restore from DB.

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum characters of surrounding text captured as annotation context. */
var CONTEXT_WINDOW_LENGTH = 35;

// ─── Serialization helpers ───────────────────────────────────────────────────

/**
 * Builds an XPath string and character offset that together uniquely identify
 * a position within the annotatable content area. Called for both the start
 * and end of a selection when saving an annotation.
 *
 * @param {Element} root - The annotatable container element (annotator-wrapper).
 * @param {Node} node - The DOM node where the selection starts or ends.
 * @param {number} offset - Character offset within node, or child index if node is an element.
 * @param {string} ignoreSelector - CSS class name of highlight spans to skip when counting siblings, see note below for more info.
 * @returns {{xpath: string, offset: number}|undefined} XPath and character offset, or undefined if node is outside root or offset is out of bounds.
 *
 * Note: nodes carrying ignoreSelector are invisible to the XPath — their text content
 * is folded into the character offset instead, so existing highlights do not shift stored positions.
 */
function xpathFromRootToNode(root, node, offset, ignoreSelector) {
  var currentNode = node;
  var xpath = '';
  var totalOffset = offset;

  // Image elements have no text node children, so the selection container is the parent element.
  if (currentNode === root && offset < root.childNodes.length && root.childNodes[offset].nodeType === Node.TEXT_NODE) {
    currentNode = root.childNodes[offset];
  }
  if (currentNode === root) {
    if (offset >= root.childNodes.length) {
      return undefined;
    }
    var actualNode = root.childNodes[offset];
    if (actualNode.nodeType === Node.TEXT_NODE) {
      xpath = "/";

    } else {
      var likeNodesList = root.querySelectorAll(actualNode.nodeName.toLowerCase());
      var likeNodesCounter = 1;
      var found = false;
      var BreakException = {};
      try {
        // forEach has no early-exit mechanism; this throw/catch exits the loop once the target node is found.
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
            if (counterNode.nodeName === currentName &&
                counterNode.className.indexOf(ignoreSelector) === -1) {
              nodeCount += 1;
            }
          }
          xpath = "/" + currentName.toLowerCase() + '[' + nodeCount + ']' + xpath;
        } else if (currentNode.nodeName === "IMG") {
          // IMG inside a highlight span: the outer branch already built an XPath segment for the enclosing element; skip offset accumulation.
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

/**
 * Captures a short window of plain text immediately before and after a selection.
 * This surrounding context is saved with each annotation so it can be used to
 * re-anchor the annotation if the page content shifts after saving.
 *
 * @param {Range} range - The live browser selection.
 * @param {Element} root - The annotatable container element.
 * @param {string} ignoreSelector - CSS class name of highlight spans to skip when walking siblings.
 * @returns {{prefix: string, suffix: string}} Up to CONTEXT_WINDOW_LENGTH characters on each side of the selection.
 */
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

  while (prefix.length <= CONTEXT_WINDOW_LENGTH &&
         (prefixCounterNode = prefixCounterNode.previousSibling) &&
         root.contains(prefixCounterNode)) {
    prefix = prefixCounterNode.textContent + prefix;
  }

  while (suffix.length <= CONTEXT_WINDOW_LENGTH &&
         (suffixCounterNode = suffixCounterNode.nextSibling) &&
         root.contains(suffixCounterNode)) {
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

/**
 * Returns the plain-text representation of a selection. Any images within the
 * selection are represented as "[Image: alt-text]" so the stored quote remains
 * readable without embedding image data.
 *
 * @param {Range|Object} range - A live browser Range, or a serialized range object with an "exact" property.
 * @returns {string} The selected text, trimmed, with any images described inline.
 */
function getExactText(range) {
  // range.toString() returns "[object Object]" when called on a plain object rather than a live Range.
  var isPlainObject = (range.toString() === "[object Object]");
  var exact = isPlainObject ? range.exact : range.toString();
  if (isPlainObject) {
    return exact ? exact.trim() : '';
  }
  var rangeContents = range.cloneContents();
  var possibleImageList = rangeContents.querySelectorAll('img');
  var rangeContainsImage = possibleImageList.length;
  if (rangeContainsImage) {
    // NodeList.forEach is absent in some older environments; convert to array to guarantee iteration.
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

/**
 * Calculates where a selection starts and ends as raw character counts from
 * the beginning of the annotatable content area. Stored alongside XPath data
 * as a fallback so annotations can be recovered if element tags are renamed.
 *
 * @param {Range} range - The live browser selection.
 * @param {Element} root - Any element within the annotatable area; the function
 *   walks up to find the nearest annotator-wrapper ancestor if needed.
 * @param {string} ignoreSelector - Accepted for API consistency; not used by this function.
 * @returns {{startOffset: number, endOffset: number}} Character counts from the start of annotator-wrapper.
 *
 * Note: if annotator-wrapper is not found, returns {startOffset: 0, endOffset: 0} as a safe fallback.
 * Approach from: https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container
 */
function getGlobalOffset(range, root, ignoreSelector) {
  var preRangeRange = document.createRange();
  root = jQuery(root)[0];
  if (root.className.indexOf('annotator-wrapper') === -1) {
    root = root.querySelector('.annotator-wrapper');
    if (!root) {
      return { startOffset: 0, endOffset: 0 };
    }
  }
  preRangeRange.selectNodeContents(root);
  preRangeRange.setEnd(range.startContainer, range.startOffset);
  return {
    startOffset: preRangeRange.toString().length,
    endOffset: preRangeRange.toString().length + range.toString().length
  };
}

/**
 * Converts a live browser text selection into a JSON object that can be saved
 * to the database. The result contains three parallel representations of the
 * selection position — XPath with character offsets, surrounding text context,
 * and a global character offset — so the annotation can be restored even if
 * the page's HTML structure changes between saving and loading.
 *
 * @param {Range} range - The live browser selection to serialize.
 * @param {Element} root - The annotatable container element or a descendant;
 *   the function resolves the nearest annotator-wrapper ancestor automatically.
 * @param {string} ignoreSelector - CSS class of highlight spans; excluded from
 *   position calculations so existing highlights do not corrupt stored offsets.
 * @returns {{xpath: Object, text: Object, position: Object}|undefined} Serialized range ready to store, or undefined if the selection endpoints cannot be mapped to an XPath within root.
 */
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
  if (!startResult || !endResult) {
    return undefined;
  }
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

/**
 * Walks the subtree below root_node to find the text node and character position
 * that correspond to a given character count from the start of root_node's content.
 * Used to convert a stored global character offset back into a live DOM position.
 *
 * @param {Node} root_node - The element to search within.
 * @param {number} goal_offset - Number of characters to count from the start of root_node's text content.
 * @returns {{node: Text, offset: number}|undefined} The text node and offset within it, or undefined if not found.
 */
function findTextNodeAtOffset(root_node, goal_offset) {
  var node_list = root_node.childNodes;
  var goal = goal_offset;
  var currOffset = 0;
  var found;
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

/**
 * Checks whether two strings represent the same annotated text, using a fuzzy
 * comparison that accepts one string being a repeated subset of the other.
 * Used when verifying that a restored annotation points to the right passage.
 *
 * @param {string} text1 - First string.
 * @param {string} text2 - Second string.
 * @returns {boolean} True if the strings are equal, or if one is a repeated subset of the other.
 */
function compareExactText(text1, text2) {
  function getDiff(string, diffBy) {
    // Removes all occurrences of diffBy from string by splitting on it and rejoining.
    // If the remainder trims to empty, string consists entirely of repetitions of diffBy.
    return string.split(diffBy).join('');
  }
  const res1 = getDiff(text1, text2);
  const res2 = getDiff(text2, text1);
  return text1 === text2 || res1.trim().length === 0 || res2.trim().length === 0;
}

/**
 * Returns the starting position of every occurrence of searchStr within str.
 * Used during fallback annotation matching to find all candidate locations
 * where a stored quote might appear in the current document text.
 *
 * @param {string} searchStr - The substring to search for.
 * @param {string} str - The string to search within.
 * @param {boolean} caseSensitive - When false, both strings are lowercased before searching.
 * @returns {number[]} Zero-based start positions of each match; empty array if searchStr is empty.
 *
 * Note: adapted from https://stackoverflow.com/questions/3410464/how-to-find-indices-of-all-occurrences-of-one-string-in-another-in-javascript
 */
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

/**
 * Follows a stored XPath string down the DOM tree to find the element it describes,
 * then uses character counting to locate the exact text node and offset within that
 * element. This is the primary strategy for restoring a saved annotation position
 * (Way 1 in normalizeRange).
 *
 * @param {Element} root - The annotatable container element.
 * @param {string} xpath - XPath string relative to root, as produced by xpathFromRootToNode.
 * @param {number} offset - Character offset within the resolved element.
 * @param {string} ignoreSelector - CSS class of highlight spans; skipped when matching siblings.
 * @returns {{node: Text, offset: number}|undefined} Text node and offset, or undefined if the path cannot be resolved.
 *
 * Note: if any XPath step matches no element in the current DOM, returns undefined rather than
 * continuing on a wrong ancestor. Callers should treat undefined as a miss and fall back to another strategy.
 */
function getNodeFromXpath(root, xpath, offset, ignoreSelector) {
  // Strip /text()[n] steps — the walk uses element nodes only and resolves text positions via character offset.
  var tree = xpath.replace(/\/text\(\)\[(.*)\]/g, '').split('/');
  tree = tree.filter(function(it) { return it.length > 0; });
  var traversingDown = root;
  tree.forEach(function(it) {
    if (traversingDown === null) { return; }
    var selector = it.replace(/\[.*\]/g, '');                          // "div[2]" → "div": element name without sibling index.
    var counter = parseInt(it.replace(/.*?\[(.*)\]/g, '$1'), 10) - 1; // "div[2]" → 1: 1-based XPath index to 0-based array index.

    var foundNodes = Array.prototype.filter.call(traversingDown.children, function(el1) {
      return el1.matches(selector);
    });
    foundNodes = [].slice.call(foundNodes).filter(function(node) {
      return node.className.indexOf(ignoreSelector) === -1;
    });
    if (isNaN(counter) || counter < 0) {
      counter = 0;
      traversingDown = foundNodes[counter];
      while (counter < foundNodes.length - 1 && traversingDown.className.indexOf(ignoreSelector) > -1) {
        traversingDown = foundNodes[++counter];
      }
    } else if (!foundNodes || foundNodes.length === 0) {
      traversingDown = null;
    } else {
      traversingDown = foundNodes[counter];
      while (counter < foundNodes.length - 1 && traversingDown.className.indexOf(ignoreSelector) > -1) {
        traversingDown = foundNodes[++counter];
      }
    }
  });
  if (traversingDown === null) {
    return undefined;
  }
  var found = findTextNodeAtOffset(traversingDown, offset);
  return found;
}

/**
 * Converts a stored annotation object back into a live browser Range so the
 * annotated text can be highlighted on screen. Tries three strategies in order,
 * falling back if the previous one fails or resolves the wrong text:
 *   Way 1 — follow the stored XPath to find the exact node
 *   Way 2 — use the global character offset (survives element tag renames)
 *   Way 3 — search the document for the exact quote, matched by prefix/suffix context
 *            (survives text inserted before the annotation)
 *
 * @param {Object} serializedRange - The stored annotation range as returned by serializeRange.
 * @param {Element} root - The annotatable container or a descendant; annotator-wrapper is resolved automatically.
 * @param {string} ignoreSelector - CSS class of highlight spans to exclude from position matching.
 * @returns {Range|undefined} A live browser Range, or undefined if no strategy could locate the annotation.
 *
 * Note: does not throw if the annotation cannot be precisely located. If the stored range predates
 * the text or position fields, the affected strategy is skipped and the next one is tried.
 */
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

  // Way 1: resolve position via XPath.
  var startResult = getNodeFromXpath(root, _start, _startOffset, ignoreSelector);
  var endResult = getNodeFromXpath(root, _end, _endOffset, ignoreSelector);
  if (startResult && endResult) {
    var normalizedRange = document.createRange();
    normalizedRange.setStart(startResult.node, startResult.offset);
    normalizedRange.setEnd(endResult.node, endResult.offset);
  }

  var textExact = serializedRange.text && serializedRange.text.exact;
  var hasPosition = !!(serializedRange.position);

  // Way 2: XPath node missing or text mismatch — fall back to global character offset.
  // Trigger Way 2 if XPath resolved nothing, or if the text it found doesn't match the stored quote.
  if (!(startResult && endResult) || (textExact && !compareExactText(getExactText(normalizedRange), textExact))) {
    if (hasPosition) {
      startResult = findTextNodeAtOffset(root, serializedRange.position.globalStartOffset);
      endResult = findTextNodeAtOffset(root, serializedRange.position.globalEndOffset);

      if (startResult && endResult) {
        normalizedRange = document.createRange();
        normalizedRange.setStart(startResult.node, startResult.offset);
        normalizedRange.setEnd(endResult.node, endResult.offset);
      }
    }
  }

  // Way 3: global offset still wrong (text added before annotation) — search the full document for the exact quote.
  if (textExact && (!normalizedRange || !compareExactText(getExactText(normalizedRange), textExact))) {
    var possibleCases = getIndicesOf(textExact, root.textContent, true);

    for (var i = 0; i < possibleCases.length; i++) {
      var poss = possibleCases[i];
      var s = findTextNodeAtOffset(root, poss);
      var e = findTextNodeAtOffset(root, poss + textExact.length);

      if (!s || !e) { continue; }

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

/**
 * Examines a single DOM node to determine whether it falls within the given Range,
 * splitting text nodes at range boundaries as needed. Returns the collected nodes
 * and whether the range end has been reached. Called by collectTextNodesInRange
 * to process one node at a time during the DOM walk.
 *
 * @param {Node} currentNode - The node to examine.
 * @param {Range} range - The Range being walked.
 * @returns {{foundEnd: boolean, nodes: Node[], currentNode: Node}}
 *
 * Note: mutates the DOM by calling splitText on text nodes at the range boundaries.
 * The browser updates the Range's start/end container references automatically after each split.
 */
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

/**
 * Walks the DOM starting from currentNode and collects every text node and inline
 * image that falls within the given Range, including nodes that span sibling
 * elements, nested elements, and parent boundaries.
 *
 * @param {Node} currentNode - The node to start walking from.
 * @param {Range} range - The Range being walked.
 * @returns {{foundEnd: boolean, nodes: Node[]}} All nodes inside the Range.
 *
 * Note: triggers DOM mutations (text node splits) via extractRangeNodes.
 */
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
    // Ascend until finding an ancestor that has a next sibling, then continue traversal from that sibling.
    while (currentNode.parentNode && !currentNode.parentNode.nextSibling) {
      currentNode = currentNode.parentNode;
    }
    if (!currentNode.parentNode) {
      return { foundEnd: foundEnd, nodes: nodeList };
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

/**
 * Takes a list of stored annotation range objects, restores each one to a live
 * browser Range, and collects all the individual text and image nodes that fall
 * within those ranges. The calling drawer uses this list to wrap each node in a
 * highlight span when rendering annotations on screen.
 *
 * @param {Object[]} ranges - Array of serialized range objects as returned by serializeRange.
 * @param {Element} root - The annotatable container element.
 * @returns {Node[]} Flat list of all text and image nodes across all provided ranges.
 */
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
