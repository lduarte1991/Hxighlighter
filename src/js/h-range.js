'use strict';

function xpathFromRootToNode(root, node, offset, ignoreSelector) {
    var currentNode = node;
    var xpath = '';
    var totalOffset = offset;

    // this is often the case when highlighting images as <img> nodes do not have a text node child
    if (currentNode === root && root.childNodes[offset].nodeType === Node.TEXT_NODE) {
        currentNode = root.childNodes[offset];
    }
    if (currentNode === root) {
        //console.log('totally root');
        var actualNode = root.childNodes[offset];
        if (actualNode.nodeType === Node.TEXT_NODE) {
            xpath = "/";
            var nodeList = root.childNodes;

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
                if (e !== BreakException) { throw e};
            }
            if (found) {
                xpath = "/" + actualNode.nodeName.toLowerCase() + '[' + likeNodesCounter + ']' + xpath;
                totalOffset = 0;
            }
        }
    } else {
        while(currentNode !== null && currentNode !== root) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                var textNodeCount = 1;
                var traverseNode = currentNode;
                // //console.log(traverseNode.parentNode.childNodes);
                while (traverseNode = traverseNode.previousSibling) {
                    //console.log(traverseNode);
                    totalOffset += traverseNode.textContent.length;
                }
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                if (currentNode.className.indexOf(ignoreSelector) < 0) {
                    var nodeCount = 1;
                    var currentName = currentNode.nodeName;
                    var counterNode = currentNode;
                    while (counterNode = counterNode.previousSibling) {
                        if (counterNode.nodeName === currentName) {
                            nodeCount += 1;
                        }
                    }
                    xpath = "/" + currentName.toLowerCase() + '[' + nodeCount + ']' + xpath;
                } else if (currentNode.nodeName == "IMG") {

                } else {
                    var traverseNode = currentNode;
                    while (traverseNode = traverseNode.previousSibling) {
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
    var prefix = prefixCounterNode.textContent.slice(0,prefixOffset);
    var suffix = suffixCounterNode.textContent.slice(suffixOffset);
    
    //console.log(suffixCounterNode, range.endOffset);
    
    while(prefix.length <= 35 && (prefixCounterNode = prefixCounterNode.previousSibling)) {
        prefix = prefixCounterNode.textContent + prefix;
    }

    while(suffix.length <= 35 && (suffixCounterNode = suffixCounterNode.nextSibling)){
        suffix = suffix + suffixCounterNode.textContent;
    }

    if (prefix.length >= 36) {
        prefix = prefix.slice(prefix.length-35);
    }
    if (suffix.length >= 36) {
        suffix = suffix.slice(0, 35);
    }

    return {
        prefix: prefix,
        suffix: suffix
    }
};

// general idea came from responses to this question
// https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container
function getGlobalOffset(range, root, ignoreSelector) {
    var preRangeRange = document.createRange(); //range.cloneRange();
    var root = jQuery(root)[0];
    if (root.className.indexOf('annotator-wrapper') == -1) {
        root = root.querySelector('.annotator-wrapper')
    }
    preRangeRange.selectNodeContents(jQuery(root)[0]);
    preRangeRange.setEnd(range.startContainer, range.startOffset);
    return {
        startOffset: preRangeRange.toString().length,
        endOffset: preRangeRange.toString().length + range.toString().length
    }
}

function getExactText(range) {
    var exact = (range.toString() == "[object Object]") ? range.exact : range.toString();
    var rangeContents = range.cloneContents();
    var possibleImageList = rangeContents.querySelectorAll('img');
    var rangeContainsImage = possibleImageList.length;
    //console.log(exact, rangeContents, possibleImageList, rangeContainsImage);
    if (rangeContainsImage) {
        if (typeof(possibleImageList.forEach) !== "function") {
            var convertToArray = [];
            for (var i = possibleImageList.length - 1; i >= 0; i--) {
                convertToArray.push(possibleImageList[i]);
            }
            possibleImageList = convertToArray;
        }

        possibleImageList.forEach(function(im) {
            //console.log(rangeContents);
            // ie support
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
            if (!Array.prototype.findIndex) {
              Object.defineProperty(Array.prototype, 'findIndex', {
                value: function(predicate) {
                 // 1. Let O be ? ToObject(this value).
                  if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                  }

                  var o = Object(this);

                  // 2. Let len be ? ToLength(? Get(O, "length")).
                  var len = o.length >>> 0;

                  // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                  if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                  }

                  // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                  var thisArg = arguments[1];

                  // 5. Let k be 0.
                  var k = 0;

                  // 6. Repeat, while k < len
                  while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                    // d. If testResult is true, return k.
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                      return k;
                    }
                    // e. Increase k by 1.
                    k++;
                  }

                  // 7. Return -1.
                  return -1;
                },
                configurable: true,
                writable: true
              });
            }
            // https://tc39.github.io/ecma262/#sec-array.prototype.findindex
            var indexOfImage = [].slice.call(rangeContents.childNodes).findIndex(function(el) {
                return el ===im
            });
            if (indexOfImage === 0) {
                exact = '[Image: ' +im.alt+ ']' + exact; 
            } else if(indexOfImage === rangeContents.childNodes.length - 1) {
                exact += '[Image: ' +im.alt+ ']';
            } else {
                var prefix = '';
                var prefixCounter = indexOfImage - 1;
                while (prefixCounter >= 0) {
                    prefix = rangeContents.childNodes[prefixCounter].textContent + prefix;
                    //console.log(prefix)
                    prefixCounter--;
                }

                var suffix = '';
                var suffixCounter = indexOfImage + 1;
                while(suffixCounter < rangeContents.childNodes.length) {
                    suffix += rangeContents.childNodes[suffixCounter].textContent;
                    suffixCounter++;
                }
                exact = prefix + ' [Image: ' + im.alt + '] ' + suffix;
            }
        });
    }
    return exact.trim();
}

function compareExactText(text1, text2) {
    function getDiff(string, diffBy){
        return string.split(diffBy).join('')
    }
    const res1 = getDiff(text1, text2);
    const res2 = getDiff(text2, text1);
    return text1 === text2 || res1.trim().length === 0 || res2.trim().length === 0;
};

function serializeRange(range, root, ignoreSelector) {
    var root = jQuery(root)[0];
    if (root.className.indexOf('annotator-wrapper') == -1) {
        root = root.querySelector('.annotator-wrapper')
    }
    //console.log(root);
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
};

function recurseGetNodeFromOffset(root_node, goal_offset) {
    var node_list = root_node.childNodes;
    var goal = goal_offset;
    var currOffset = 0;
    var found = undefined;
    if (goal === 0 && node_list.length === 0) {
        found = {
            node: root_node,
            offset: 0
        }
    }
    //console.log(root_node, node_list, goal);

    for (var i = 0; i < node_list.length; i++) {
        //console.log(i, currOffset);
        var node = node_list[i];
        if (node.textContent.length + currOffset >= goal) {
            if (node.nodeType !== Node.TEXT_NODE) {
                //console.log("NOT TEXT NODE: ", node, node.nodeName, goal, currOffset);
                found = recurseGetNodeFromOffset(node, goal - currOffset)
                break;
            } else {
                //console.log("REACHED END:", node, node.textContent, node.textContent.length, goal, currOffset)
                found = {
                    node: node,
                    offset: goal - currOffset
                }
                break;
            }
        } else {
            currOffset += node.textContent.length;
        }
    };
    return found;
};

// function getActualNodeFromOffset(elementNode, offset) {
//     var foundNode = elementNode;
//     var currentNode = elementNode.firstChild;
//     var offsetLimit = currentNode.textContent.length;
//     var finalOffset = offset;
//     // //console.log(currentNode, offsetLimit, offset);
//     while (foundNode === elementNode && offsetLimit < offset) {
//         currentNode = currentNode.nextSibling;
//         if (offsetLimit + currentNode.textContent.length >= offset) {
//             //console.log(currentNode, currentNode.nodeType, Node.ELEMENT_NODE);
//             if (currentNode.nodeType == Node.ELEMENT_NODE) {
//                 currentNode = currentNode.firstChild;
//                 if (offsetLimit + currentNode.textContent.length >= offset) {
//                     foundNode = currentNode;
//                     finalOffset = offset - offsetLimit;
//                 }
//             } else {
//                 foundNode = currentNode;
//                 finalOffset = offset - offsetLimit;
//             }
//         }
//         offsetLimit += currentNode.textContent.length;
//     }

//     return {
//         node: foundNode,
//         offset: finalOffset
//     }
// }

function getNodeFromXpath(root, xpath, offset, ignoreSelector) {
    var tree = xpath.replace(/\/text\(\)\[(.*)\]/g, '').split('/');
    tree = tree.filter(function(it) { return it.length > 0 });
    var traversingDown = root;
    tree.forEach(function(it) {
        var selector = it.replace(/\[.*\]/g, '');
        var counter = parseInt(it.replace(/.*?\[(.*)\]/g, '$1'), 10) - 1;

        var foundNodes = traversingDown.querySelectorAll(selector)
        foundNodes = [].slice.call(foundNodes).filter(function(node) {
            return node.className.indexOf(ignoreSelector) == -1;
        })
        // //console.log(foundNodes, counter);
        if (counter == NaN || counter < 0) {
            counter = 0;
            traversingDown = foundNodes[counter];
            while(traversingDown.className.indexOf(ignoreSelector) > -1) {
                traversingDown = foundNodes[++counter];
            }
            //console.log('1', traversingDown, traversingDown.className);
        } else if(!foundNodes || foundNodes.length === 0){
            // should account for missing html elements without affecting text
        } else {
            traversingDown = foundNodes[counter];
            while(traversingDown.className.indexOf(ignoreSelector) > -1) {
                traversingDown = foundNodes[++counter];
            }
            //console.log('2', traversingDown, traversingDown.className);
        }
    });
    //console.log("TRAVERSINGDOWN", traversingDown, offset);
    var found = recurseGetNodeFromOffset(traversingDown, offset);
    ////console.log(found);
    return found
};

// https://stackoverflow.com/questions/3410464/how-to-find-indices-of-all-occurrences-of-one-string-in-another-in-javascript
function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
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


function normalizeRange(serializedRange, root, ignoreSelector) {
    var root = jQuery(root)[0];
    if (root.className.indexOf('annotator-wrapper') == -1) {
        root = root.querySelector('.annotator-wrapper')
    }
    var sR = serializedRange.xpath ? serializedRange.xpath : serializedRange;
    var _start = sR.start;
    var _end = sR.end;
    var _startOffset = sR.startOffset;
    var _endOffset = sR.endOffset;
    // three ways of getting text:
    
    // Way #1: Given an xpath, find the way to the node
    var startResult = getNodeFromXpath(root, _start, _startOffset, ignoreSelector);
    var endResult = getNodeFromXpath(root, _end, _endOffset, ignoreSelector);
    if (startResult && endResult) {
        var normalizedRange = document.createRange();
        normalizedRange.setStart(startResult.node, startResult.offset);
        normalizedRange.setEnd(endResult.node, endResult.offset);
        //console.log('HERE', _start, _startOffset, _end, _endOffset, startResult, endResult, getExactText(normalizedRange), serializedRange.text.exact);
        console.log("Xpath Test: ", compareExactText(getExactText(normalizedRange), serializedRange.text.exact) ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")

    }
    //console.log(_start, _startOffset, startResult, endResult);
    //console.log(getPrefixAndSuffix(normalizedRange, root, ignoreSelector))
    // Way #2: if that doesn't match what we have stored as the quote, try global positioning from root
    // This is for the usecase where someone has changed tagnames so xpath cannot be found
    if (!(startResult && endResult) || (serializedRange.text.exact && !compareExactText(getExactText(normalizedRange), serializedRange.text.exact))) {
        startResult = recurseGetNodeFromOffset(root, serializedRange.position.globalStartOffset); //getNodeFromXpath(root, '/', serializedRange.position.globalStartOffset, ignoreSelector);
        endResult = recurseGetNodeFromOffset(root, serializedRange.position.globalEndOffset); //getNodeFromXpath(root, '/', serializedRange.position.globalEndOffset, ignoreSelector);
        
        normalizedRange = document.createRange();
        normalizedRange.setStart(startResult.node, startResult.offset);
        normalizedRange.setEnd(endResult.node, endResult.offset);
        console.log("Global offset Test: ", getExactText(normalizedRange) === serializedRange.text.exact ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")
    }

    // Way #3: looks for an exact match of prefix, suffix, and exact
    // This is for the usecase where someone has added text/html before this
    if (serializedRange.text.exact && !compareExactText(getExactText(normalizedRange), serializedRange.text.exact)) {
        var possibleCases = getIndicesOf(serializedRange.text.exact, root.textContent, true);
        
        for (var i = 0; i < possibleCases.length; i++) {
            var poss = possibleCases[i];
            var s = recurseGetNodeFromOffset(root, poss);
            var e = recurseGetNodeFromOffset(root, poss + serializedRange.text.exact.length);

            normalizedRange = document.createRange();
            normalizedRange.setStart(s.node, s.offset);
            normalizedRange.setEnd(e.node, e.offset);

            var toCheck = getPrefixAndSuffix(normalizedRange, root, ignoreSelector);
            if (serializedRange.text.prefix === toCheck.prefix && serializedRange.text.suffix === toCheck.suffix) {
                console.log("Exact Wording Test: ", getExactText(normalizedRange) === serializedRange.text.exact ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")
                break;
            }
        }
    }

    // Possible Way #4: fuzzy search? TBD, no idea how to do this. fuzzy substrings are not as common as searching list of records

    return normalizedRange;
};

function checkNode(currentNode, range) {
    var foundEnd = false;
    var nodeList = [];
    if (currentNode) {
        if (currentNode.nodeType == Node.TEXT_NODE) {
            if (currentNode === range.startContainer) {
                currentNode = currentNode.splitText(range.startOffset)
                // console.log('Beginning', currentNode);
            }
            if (currentNode === range.endContainer) {
                foundEnd = true;
                currentNode.splitText(range.endOffset);
                // console.log('Ending', currentNode);
            }

            if ((range.startContainer === range.endContainer && range.startOffset === range.endOffset)) {
                foundEnd = true;
            }
            // console.log('Node', currentNode, foundEnd, range.startContainer === range.endContainer);
            nodeList.push(currentNode);
        } else if(currentNode.nodeType === Node.ELEMENT_NODE && currentNode.nodeName === "IMG"){
            //console.log("GETS HERE", range.startContainer.nodeType, range.startContainer.childNodes.length, range.startOffset);
            if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.childNodes.length < range.startOffset) {
                var possibleStartNode = range.startContainer.childNodes[range.startOffset];
                if (possibleStartNode === currentNode) {
                    nodeList.push(currentNode);
                    if (range.startContainer === range.endContainer && range.endOffset - range.startOffset === 1) {
                        foundEnd = true;
                    }
                }
            } else if(!foundEnd && range.endContainer.nodeType === Node.ELEMENT_NODE && range.endContainer.childNodes.length < range.endOffset) {
                //console.log("second")
                var possibleEndNode = range.endContainer.childNodes[range.endOffset]
                if (possibleEndNode === currentNode) {
                    foundEnd = true;
                    nodeList.push(currentNode);
                }
            } else {
                //console.log("third", nodeList, currentNode);
                foundEnd = false;
                nodeList.push(currentNode);
            }
            //console.log("Node contains image! What do I do?", currentNode.src, foundEnd, nodeList);
        } else {
            if (currentNode.firstChild) {
                var result = recurseFromNodeToNode(currentNode.firstChild, range);
                //console.log("RETURN2:", result);
                foundEnd = result.foundEnd;
                nodeList = nodeList.concat(result.nodes);
            }
        }
    }
    return {
        foundEnd: foundEnd,
        nodes: nodeList,
        currentNode: currentNode
    }
}

function recurseFromNodeToNode(currentNode, range) {
    var nodeList = [];
    var foundEnd = false;
    var originalNode = currentNode;
    //console.log("RECURS", currentNode);
    var result = checkNode(currentNode, range);
    currentNode = result.currentNode;
    if (!foundEnd) {
        foundEnd = result.foundEnd;
    }
    nodeList = nodeList.concat(result.nodes);
    //console.log('rFN2N: ', foundEnd);
    while (!foundEnd && originalNode && ((currentNode = currentNode.nextSibling) !== null)) {
        //console.log("SIBS")
        var res = checkNode(currentNode, range);
        //console.log("RETURN", res);
        if (!foundEnd) {
            foundEnd = res.foundEnd;
        }
        nodeList = nodeList.concat(res.nodes);
    }
    //console.log('aftersibs', foundEnd);
    if (!foundEnd && originalNode) {
        currentNode = originalNode;
        //console.log("Parent:", originalNode.parentNode);
        //console.log("ParentSibling:", originalNode.parentNode.nextSibling)
        while(!currentNode.parentNode.nextSibling) {
            currentNode = currentNode.parentNode;
            //console.log("New parent:", currentNode);
        }
        currentNode = currentNode.parentNode.nextSibling;
        //console.log("RENTS");
        var res = recurseFromNodeToNode(currentNode, range);
        if (!foundEnd) {
            foundEnd = res.foundEnd;
        }
        nodeList = nodeList.concat(res.nodes);
    }
    //console.log('afterrents', foundEnd);
    return {
        foundEnd: foundEnd,
        nodes: nodeList
    }
};

function getTextNodesFromAnnotationRanges(ranges, root) {
    var textNodesList = [];

    ranges.forEach(function(range) {
        var normRanged = normalizeRange(range, root, 'annotator-hl')//recurseFromNodeToNode(range.startContainer, range);
        var nodes = recurseFromNodeToNode(normRanged.startContainer, normRanged);
        //console.log(normRanged, ranges, nodes, normRanged.cloneContents());
        textNodesList = textNodesList.concat(nodes.nodes);
    });

    return textNodesList
}

exports.serializeRange = serializeRange;
exports.normalizeRange = normalizeRange;
exports.getGlobalOffset = getGlobalOffset;
exports.getTextNodesFromAnnotationRanges = getTextNodesFromAnnotationRanges;
exports.getNodeFromXpath = getNodeFromXpath;