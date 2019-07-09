'use strict';

function xpathFromRootToNode(root, node, offset, ignoreSelector) {
    var currentNode = node;
    var xpath = '';
    var totalOffset = offset;
    while(currentNode !== null && currentNode != root) {
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
            } else {
                var traverseNode = currentNode;
                while (traverseNode = traverseNode.previousSibling) {
                    totalOffset += traverseNode.textContent.length;
                }
            }
        }
        currentNode = currentNode.parentNode;
    }
    if (currentNode != null) {
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
    var prefix = prefixCounterNode.textContent.slice(0,range.startOffset);
    var suffix = suffixCounterNode.textContent.slice(range.endOffset);
    
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
    var preRangeRange = new Range(); //range.cloneRange();
    preRangeRange.selectNodeContents(jQuery(root)[0]);
    preRangeRange.setEnd(range.startContainer, range.startOffset);
    return {
        startOffset: preRangeRange.toString().length,
        endOffset: preRangeRange.toString().length + range.toString().length
    }
}

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

    var exact = (range.toString() == "[object Object]") ? range.exact : range.toString();

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
    // //console.log(node_list, goal);

    for (var i = 0; i < node_list.length; i++) {
        var node = node_list[i];
        if (node.textContent.length + currOffset >= goal) {
            if (node.nodeType !== Node.TEXT_NODE) {
                // //console.log("NOT TEXT NODE: ", node, node.nodeName, goal, currOffset);
                found = recurseGetNodeFromOffset(node, goal - currOffset)
                break;
            } else {
                // //console.log("REACHED END:", node, node.textContent, node.textContent.length, goal, currOffset)
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
        // //console.log(foundNodes, counter);
        if (counter == NaN || counter < 0) {
            traversingDown = foundNodes[0];
        } else if(!foundNodes || foundNodes.length === 0){
            // should account for missing html elements without affecting text
        } else {
            traversingDown = foundNodes[counter]
        }
    });
    // //console.log("TRAVERSINGDOWN", traversingDown);
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
        var normalizedRange = new Range();
        //console.log(startResult, endResult);
        normalizedRange.setStart(startResult.node, startResult.offset);
        normalizedRange.setEnd(endResult.node, endResult.offset);
    }
    //console.log("Xpath Test: ", normalizedRange.toString() === serializedRange.text.exact ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")
    //console.log(getPrefixAndSuffix(normalizedRange, root, ignoreSelector))
    // Way #2: if that doesn't match what we have stored as the quote, try global positioning from root
    // This is for the usecase where someone has changed tagnames so xpath cannot be found
    if (!(startResult && endResult) || (serializedRange.text && normalizedRange.toString() !== serializedRange.text.exact)) {
        startResult = recurseGetNodeFromOffset(root, serializedRange.position.globalStartOffset); //getNodeFromXpath(root, '/', serializedRange.position.globalStartOffset, ignoreSelector);
        endResult = recurseGetNodeFromOffset(root, serializedRange.position.globalEndOffset); //getNodeFromXpath(root, '/', serializedRange.position.globalEndOffset, ignoreSelector);
        
        normalizedRange = new Range();
        normalizedRange.setStart(startResult.node, startResult.offset);
        normalizedRange.setEnd(endResult.node, endResult.offset);
        //console.log("Global offset Test: ", normalizedRange.toString() === serializedRange.text.exact ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")
    }

    // Way #3: looks for an exact match of prefix, suffix, and exact
    // This is for the usecase where someone has added text/html before this
    if (serializedRange.text && normalizedRange.toString() !== serializedRange.text.exact) {
        var possibleCases = getIndicesOf(serializedRange.text.exact, root.textContent, true);
        
        for (var i = 0; i < possibleCases.length; i++) {
            var poss = possibleCases[i];
            var s = recurseGetNodeFromOffset(root, poss);
            var e = recurseGetNodeFromOffset(root, poss + serializedRange.text.exact.length);

            normalizedRange = new Range();
            normalizedRange.setStart(s.node, s.offset);
            normalizedRange.setEnd(e.node, e.offset);

            var toCheck = getPrefixAndSuffix(normalizedRange, root, ignoreSelector);
            if (serializedRange.text.prefix === toCheck.prefix && serializedRange.text.suffix === toCheck.suffix) {
                //console.log("Exact Wording Test: ", normalizedRange.toString() === serializedRange.text.exact ? "YES THEY MATCH" : "NO THEY DO NOT MATCH")
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
            if (currentNode == range.startContainer) {
                currentNode = currentNode.splitText(range.startOffset)
                //console.log('Beginning', currentNode);
            }
            if (currentNode == range.endContainer) {
                foundEnd = true;
                currentNode.splitText(range.endOffset);
                //console.log('Ending', currentNode);
            }
            //console.log('Node', currentNode);
            nodeList.push(currentNode);
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
        //console.log(normRanged, nodes);
        textNodesList = textNodesList.concat(nodes.nodes);
    });

    return textNodesList
}

exports.serializeRange = serializeRange;
exports.normalizeRange = normalizeRange;
exports.getGlobalOffset = getGlobalOffset;
exports.getTextNodesFromAnnotationRanges = getTextNodesFromAnnotationRanges;