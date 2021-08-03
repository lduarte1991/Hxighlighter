var hrange = require('../h-range.js');
(function($) {
    $.TempJSON = function(options, inst_id) {
        this.options = options;
        this.instance_id = inst_id;
        this.store = [];
        this.setUpListeners();
    };

    $.TempJSON.prototype.setUpListeners = function() {
        var self = this;
        $.subscribeEvent('downloadAnnotations', self.instance_id, function(_, callBack) {
            callBack(self.store.reverse())
        });

        $.subscribeEvent('dumpStore', self.instance_id, function(_, callBack) {
            var annotations = [];
            self.store.forEach(function(ann) {
                annotations.push(self.convertFromWebAnnotation(ann));
            })
            callBack(annotations);
        });

        try {
            if(self.options.storageOptions.external_url.json_url != '') {
                var callB = function(result) {
                    jQuery.each(result.rows, function(_, ann) {
                        var waAnnotation = self.convertFromWebAnnotation(ann, jQuery(self.options.target_selector).find('.annotator-wrapper'));
                        self.store.push(ann);
                        setTimeout(function() {
                            if (waAnnotation.media.toLowerCase() == "image") {
                                $.publishEvent('wsAnnotationLoaded', self.instance_id, [waAnnotation, function() {}])
                            } else if (waAnnotation.media.toLowerCase() == "text") {
                                // console.log('definitely getting to here');
                                $.publishEvent('annotationLoaded', self.instance_id, [waAnnotation]);
                                $.publishEvent('TargetAnnotationDraw', self.instance_id, [waAnnotation]);
                            }
                        }, 250);
                    });
                }
                jQuery.ajax({
                    url: self.options.storageOptions.external_url.json_url,
                    success: function(data) {
                        $.totalAnnotations = data.rows.length;
                        callB(data);
                    }
                });
            }
        } catch(e) {

        }
    }


    $.TempJSON.prototype.onLoad = function(element, opts) {
    };

    $.TempJSON.prototype.search = function(options, callBack, errfun) {
    }

    $.TempJSON.prototype.StorageAnnotationSave = function(ann_to_save, elem, updating) {
        var self = this;
        if (updating) {
            self.StorageAnnotationUpdate(ann_to_save, elem);
            return;
        }
        ann_to_save.created = new Date();
        var save_ann = self.convertToWebAnnotation(ann_to_save, jQuery(elem).find('.annotator-wrapper'));
        self.store.push(save_ann);
        // console.log(self.store);
    };

    $.TempJSON.prototype.StorageAnnotationDelete = function(ann_to_delete, elem) {
        var self = this;
    };

    $.TempJSON.prototype.StorageAnnotationUpdate = function(ann_to_update, elem) {
        var self = this;
        var save_ann = self.convertToWebAnnotation(ann_to_update, jQuery(elem).find('.annotator-wrapper'));
        self.store.map(function(ann) {
            if (ann.id == save_ann.id) {
                return save_ann;
            }
            return ann
        });

        // console.log(self.store);
    };

    $.TempJSON.prototype.convertToWebAnnotation = function(annotation, elem) {
        var self = this;

        var tags = []
        jQuery.each(annotation.tags, function(_, t) {
            var t_el = {
                'type': 'TextualBody',
                'value': t,
                'purpose': 'tagging'
            };
            tags.push(t_el);
        })

       
        var targetList = [];
        var source_id = this.options.object_id;
        var purpose = 'commenting';
        if (annotation.media === "comment") {
            targetList.push(annotation.ranges);
            //source_id = annotation.ranges.source;
            // jQuery.each(annotation.ranges, function(_, range){
            //     targetList.push(range)
            //     source_id = range.parent;
            // });

            purpose = 'replying';
        } else {
            // console.log('convert2wa', annotation.ranges, elem);
            var serializedRanges = annotation.ranges;//self.serializeRanges(annotation.ranges, elem);
            var mediatype = this.options.mediaType.charAt(0).toUpperCase() + this.options.mediaType.slice(1);
            jQuery.each(serializedRanges, function(index, range){
                var rangeItem = range; 
                if (mediatype === "Text") {
                    rangeItem = [{
                        'type': 'RangeSelector',
                        'startSelector': {
                            'type': 'XPathSelector',
                            'value': range.xpath.start
                        },
                        'endSelector': {
                            'type': 'XPathSelector',
                            'value': range.xpath.end,
                        },
                        'refinedBy': {
                            'type': 'TextPositionSelector',
                            'start': range.xpath.startOffset,
                            'end': range.xpath.endOffset,
                        }
                    }, {
                        'type': 'TextPositionSelector',
                        'start': range.position.globalStartOffset,
                        'end': range.position.globalEndOffset,
                    }, {
                        'type': 'TextQuoteSelector',
                        'exact': range.text.exact,
                        'prefix': range.text.prefix,
                        'suffix': range.text.suffix
                    }]
                } else if (mediatype === "Image") {
                    // console.log('Should be here in image', range);
                    if (range.type === "Image") {
                        rangeItem = range.selector.items
                    } else {
                        jQuery.each(range.items, function(idx, choice) {
                            if (choice.type === "Image") {
                                rangeItem = [{
                                    'type': 'FragmentSelector',
                                    'value': choice.selector.items[0].selector.default.value
                                }, {
                                    'type': 'SvgSelector',
                                    'value': choice.selector.items[0].selector.item.value
                                }]
                            } else if (choice.type === "Thumbnail") {
                                targetList.push(choice)
                            }
                        })
                    }
                } else if (mediatype === "Video" || mediatype === "Audio") {
                    source_id = self.options.object_id;
                    rangeItem = [{
                        "type": "FragmentSelector",
                        "value": "t="+range.start+","+range.end,
                        "refinedBy": [
                            {
                              "type": "CssSelector",
                              "value": "#vid1"
                            }
                        ],
                        "conformsTo": "http://www.w3.org/TR/media-frags/"
                    }];
                }
                targetList.push({
                    'source': source_id,
                    'type': mediatype,
                    'selector': {
                        'type': 'Choice',
                        'items': rangeItem,
                    }
                });
            });
        }
        var bodyItems = []
        if (!Array.isArray(annotation.annotationText)) {
            annotation.annotationText = [annotation.annotationText];
        }
        annotation.annotationText.forEach(function(text) {
            bodyItems.push({
                'type': "TextualBody",
                'format': 'text/html',
                'language': 'en',
                'value': text,
                'purpose': purpose,
            });
        });

        var webAnnotationVersion = {
            "@context": "http://catchpy.harvardx.harvard.edu.s3.amazonaws.com/jsonld/catch_context_jsonld.json",
            'type': 'Annotation',
            'schema_version': '1.1.0',
            'id': annotation['id'],
            'creator':  {
                'id': self.options.user_id,
                'name': this.options.username,
            },
            'created': annotation.created,
            'permissions': {
                'can_read': [],
                'can_update': [this.options.user_id],
                'can_delete': [this.options.user_id],
                'can_admin': [this.options.user_id],
            },
            'platform': {
                'platform_name': 'edX',
                'context_id': this.options.context_id,
                'collection_id': this.options.collection_id,
                'target_source_id': source_id,
            },
            'body': {
                'type': 'List',
                'items': bodyItems.concat(tags),
            },
            'target': {
                'type': 'List',
                'items': targetList
            }
        };
        return webAnnotationVersion;
    };

    $.TempJSON.prototype.convertFromWebAnnotation = function(webAnn, element) {
        var self = this;
        var mediaFound = self.getMediaType(webAnn);
        var annotation = {
            annotationText: self.getAnnotationText(webAnn),
            created: self.getAnnotationCreated(webAnn),
            creator: self.getAnnotationCreator(webAnn),
            exact: self.getAnnotationExact(webAnn),
            id: self.getAnnotationId(webAnn),
            media: self.getMediaType(webAnn),
            tags: self.getAnnotationTags(webAnn),
            ranges: self.getAnnotationTarget(webAnn, jQuery(element), mediaFound),
            totalReplies: webAnn.totalReplies,
            permissions: webAnn.permissions,
        }
        if (mediaFound.toLowerCase() === "image") {
            jQuery.each(annotation['ranges'], function(index, range) {
                if (range['type'].toLowerCase() === "thumbnail") {
                    annotation['thumbnail'] = range.source;
                } else if (range['type'].toLowerCase() === "image") {
                    annotation['source_url'] = range.source;
                    var fragFound = false;
                    var svgExists = false;
                    var fragVal = "";
                    jQuery.each(range['selector']['items'], function(index, selector) {
                        try {
                            if (selector['type'].toLowerCase() === "svgselector") {
                                var svgVal = selector.value
                                if (fragFound) {
                                    svgVal = svgVal.replace('svg xmlns', 'svg ' + fragVal + ' xmlns');
                                }
                                annotation['svg'] = svgVal;
                                svgExists = true;
                            } else {
                                fragVal = 'class="thumbnail-svg-'+annotation['id']+'" viewBox="' + selector.value.replace('xywh=', '').split(',').join(' ') + '"';
                                if (svgExists) {
                                    annotation['svg'] = annotation['svg'].replace('svg xmlns', ('svg ' + fragVal + ' xmlns'));
                                }
                                fragFound = true;
                            }
                        } catch(e) {
                            if (typeof(selector['@type']) !== "undefined") {
                                fragVal = 'class="thumbnail-svg-'+annotation['id']+'" viewBox="' + selector['selector']['default']['value'].replace('xywh=', '').split(',').join(' ') + '"';
                                var svgVal = selector['selector']['item']['value'];
                                svgVal = svgVal.replace('svg xmlns', 'svg ' + fragVal + ' xmlns');
                                annotation['svg'] = svgVal;
                            }
                        }
                    });
                }
            })
        }
        return annotation;
    };

    $.TempJSON.prototype.getMediaType = function(webAnn, element) {
        var found = webAnn['target']['items'][0]['type'];
        jQuery.each(webAnn['target']['items'], function(index, item) {
            var m = item['type'].toLowerCase();

            if (m === "image" || m === "video" || m === "text" || m === "audio") {
                found = item['type'];
            }
            if (m === 'annotation') {
                found = 'comment'
            }
        });
        return found
    };

    $.TempJSON.prototype.getAnnotationTargetItems = function(webAnn) {
        try {
            
            var annType = webAnn['target']['items'][0]['type']
            // console.log("reached getAnnotationTargetItems", webAnn);
            if (annType === "Annotation") {
                // console.log([{'parent':webAnn['target']['items'][0]['source']}]);
                return [{'parent':webAnn['target']['items'][0]['source']}]
            } else if (annType === "Image" || annType === "Thumbnail") {
                return webAnn['target']['items']
            } else if (annType === "Video") {
                var fragmentSelectorItem = webAnn['target']['items'][0]['selector']['items'][0];
                if (fragmentSelectorItem.type == "FragmentSelector") {
                    var timeValue = fragmentSelectorItem.value.replace('t=', '').split(',');
                    var startTime = parseFloat(timeValue[0]);
                    var endTime = parseFloat(timeValue[1]);
                    return [{
                        start: startTime,
                        startLabel: self.humanReadable(startTime),
                        end: endTime,
                        endLabel: self.humanReadable(endTime)
                    }]
                }
                
            }
            // console.log("nope, something went wrong");
            return webAnn['target']['items'][0]['selector']['items'];
        } catch(e) {
            // console.log(e);
            return [];
        }
    };

    $.TempJSON.prototype.getAnnotationTarget = function(webAnn, element, media) {
        var self = this;
        try {
            if (media.toLowerCase() === "text") {
                var ranges = [];
                var xpathRanges = [];
                var positionRanges = [];
                var textRanges = [];
                jQuery.each(this.getAnnotationTargetItems(webAnn), function(_, targetItem) {
                    if (!('parent' in targetItem)) {
                        if (targetItem['type'] === "RangeSelector") {
                            xpathRanges.push({
                                start: targetItem['startSelector'] ? targetItem['startSelector'].value : targetItem['oa:start'].value,
                                startOffset: targetItem['refinedBy'].start,
                                end: targetItem['endSelector'] ? targetItem['endSelector'].value : targetItem['oa:end'].value,
                                endOffset: targetItem['refinedBy'].end
                            });
                        } else if (targetItem['type'] === "TextPositionSelector") {
                            positionRanges.push({
                                globalStartOffset: targetItem['start'],
                                globalEndOffset: targetItem['end'] 
                            });
                        } else if (targetItem['type'] === "TextQuoteSelector") {
                            textRanges.push({
                                prefix: targetItem['prefix'],
                                exact: targetItem['exact'],
                                suffix: targetItem['suffix']
                            })
                        }
                    } else {
                        return ranges.push(targetItem)
                    }
                });
                if ((xpathRanges.length === positionRanges.length && xpathRanges.length === textRanges.length)) {
                    for (var i = xpathRanges.length - 1; i >= 0; i--) {
                        ranges.push({
                            'xpath': xpathRanges[i],
                            'position': positionRanges[i],
                            'text': textRanges[i]
                        });
                    }
                } else if(xpathRanges.length === 1 && positionRanges.length === 0 && textRanges.length === 0) {
                    var startNode = hrange.getNodeFromXpath(element, xpathRanges[0].start, xpathRanges[0].startOffset, 'annotator-hl');
                    var endNode = hrange.getNodeFromXpath(element, xpathRanges[0].end, xpathRanges[0].endOffset, 'annotator-hl');

                    if (startNode && endNode) {
                        var normalizedRange = document.createRange();
                        normalizedRange.setStart(startNode.node, startNode.offset);
                        normalizedRange.setEnd(endNode.node, endNode.offset);
                        var serializedRange = hrange.serializeRange(normalizedRange, element, 'annotator-hl');
                        ranges.push(serializedRange);
                    }
                }
            } else if (media.toLowerCase() == "image") {
                // console.log(webAnn['target'])
                return webAnn['target']['items'];
            } else if (media.toLowerCase() == "comment") {
                return webAnn['target']['items'];
            } else if (media.toLowerCase() == "video" || media.toLowerCase() == 'audio') {
                var ranges = [];
                jQuery.each(this.getAnnotationTargetItems(webAnn), function(_, targetItem) {
                    return ranges.push(targetItem)
                });
            }
            if (webAnn['target']['items'][0]['type'] == "Annotation") {
                return ranges;
            }
            //console.log('getAnnotationTarget', ranges, element);
            return ranges;
        } catch(e) {
            // console.log(ranges, element[0]);
                throw(e);
            // console.log(ranges, element[0], this.getAnnotationTargetItems(webAnn));
            //return self.normalizeRanges(ranges, window.document);
            // console.log(e);
            return []
        }
    };

    $.TempJSON.prototype.getAnnotationText = function(webAnn) {
        try {
            var found = [];
            jQuery.each(webAnn['body']['items'], function(_, bodyItem) {
                if (bodyItem.purpose == "commenting" || bodyItem.purpose == "replying") {
                    found.push(bodyItem.value);
                }
            });
            return found;
        } catch(e) {
            return "";
        }
    }

    $.TempJSON.prototype.getAnnotationCreated = function(webAnn) {
        try {
            return new Date(webAnn['created']);
        } catch(e) {
            return new Date();
        }
    }

    $.TempJSON.prototype.getAnnotationCreator = function(webAnn) {
        try {
            return webAnn['creator'];
        } catch(e) {
            return {name:'Unknown', id:'error'};
        }
    };

    $.TempJSON.prototype.getAnnotationExact = function(webAnn) {
        try {
            var quote = '';
            jQuery.each(this.getAnnotationTargetItems(webAnn), function(_, targetItem) {
                
                if (targetItem['type'] == "TextQuoteSelector") {
                    quote += targetItem['exact'];
                } else {
                    return '';
                }
            });
            return quote;
        } catch(e) {
            return "";
        }
    };

    $.TempJSON.prototype.getAnnotationId = function(webAnn) {
        try {
            return webAnn['id'];
        } catch(e) {
            return "";
        }
    };


    $.TempJSON.prototype.getAnnotationTags = function(webAnn) {
        try {
            var tags = [];
            jQuery.each(webAnn['body']['items'], function(_, bodyItem) {
                if (bodyItem.purpose == "tagging") {
                    tags.push(bodyItem.value);
                }
            });
            return tags;
        } catch(e) {
            return [];
        }
    };

    $.TempJSON.prototype.storeCurrent = function() {
        
    };

    $.TempJSON.prototype.serializeRanges = function(ranges, elem) {
        var self = this;
        if (ranges.length < 1) {
            return {
                ranges: []
            };
        }
        var text = [],
            serializedRanges = [],
            previous = "",
            next = "",
            extraRanges = [],
            contextEl = elem[0];

        for (var i = 0, len = ranges.length; i < len; i++) {
            text = [];
            var r = ranges[i];
            if (r.text !== undefined) {
                text.push(Hxighlighter.trim(r.text()));
            } else {
                text.push(Hxighlighter.trim(self.text(r)));
            }
            try {
                previous = ranges[i]['start']['previousSibling'] ? ranges[i]['start']['previousSibling'].textContent : '';
                next = ranges[i]['end']['nextSibling'] ? ranges[i]['end']['nextSibling'].textContent: '';
            } catch(e) {
                previous = ranges[i]['startContainer']['previousSibling'] ? ranges[i]['startContainer']['previousSibling'].textContent : '';
                next = ranges[i]['endContainer']['nextSibling'] ? ranges[i]['endContainer']['nextSibling'].textContent: '';
            }

            var exact = text.join(' / ');
            var exactFullStart = jQuery(contextEl).text().indexOf(exact);
            var fullTextRange = {
                startOffset: exactFullStart,
                endOffset: exactFullStart + exact.length,
                exact: exact.replace('*',''),
                prefix: previous.substring(previous.length-20, previous.length).replace('*', ''),
                suffix: next.substring(0, 20).replace('*', '')
            };

            
            try {
                // This is the annotatorjs way to serialize");
                serializedRanges.push(r.serialize(contextEl, '.annotator-hl'));
                extraRanges.push(fullTextRange);
            } catch(e) {
                // For the keyboard made annotations
                // we are borrowing the xpath range library from annotatorjs
                // to keep them consistent
                //console.log("LOOK HERE:",r, hrange.serializeRange(r, contextEl, 'annotator-hl'));
                serializedRange = hrange.serializeRange(r, contextEl, 'annotator-hl');
                serializedRanges.push(serializedRange.xpath);
                extraRanges.push({
                    startOffset: serializedRange.position.globalStartOffset,
                    endOffset: serializedRange.position.globalEndOffset,
                    prefix: serializedRange.text.prefix,
                    exact: serializedRange.text.exact,
                    suffix: serializedRange.text.suffix
                })
            }
            // console.log("SERIALIZED", serializedRanges, contextEl);
        }
        return {
            serial: serializedRanges,
            extra: extraRanges
        }
    };

    $.TempJSON.prototype.normalizeRanges = function(ranges, elem) {
        var self = this;

        var normalizedRanges = [];
        var foundRange;
        jQuery.each(ranges, function(_, range) {
            // try {
            //    //console.log(xpathrange.toRange, elem.ownerDocument, range);
            //    foundRange = xpathrange.toRange(elem, range);
            // } catch(e) {
            //     //console.log("trying toRange");
            //console.log(elem, range.start, range.startOffset, range.end, range.endOffset);
            var foundRange = hrange.normalizeRange(range, elem, 'annotator-hl');
            // }
            // console.log(elem);
           
            // console.log(foundRange);
            normalizedRanges.push(foundRange);
        });

        return normalizedRanges;
    };

    $.TempJSON.prototype.getElementViaXpath = function(xpath, rootElem) {
        var res = document.evaluate('.' + xpath, jQuery(rootElem)[0], null, XPathResult.ANY_TYPE, null);
        return res.iterateNext();
    };

    $.TempJSON.prototype.contains = function(elem1, elem2) {
        if (document.compareDocumentPosition != null) {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY;
      }
      return false;
    };

    $.TempJSON.prototype.flatten = function(array) {
        var flatten;
        flatten = function(ary) {
          var el, flat, _i, _len;
          flat = [];
          for (_i = 0, _len = ary.length; _i < _len; _i++) {
            el = ary[_i];
            flat = flat.concat(el && jQuery.isArray(el) ? flatten(el) : el);
          }
          return flat;
        };
        return flatten(array);
    };

    $.TempJSON.prototype.getTextNodes = function(nodeContainer) {
        var self = this;
        var getTextNodes;
        getTextNodes = function(node) {
          var nodes;
          if (node && node.nodeType !== 3) {
            nodes = [];
            if (node.nodeType !== 8) {
              node = node.lastChild;
              while (node) {
                nodes.push(getTextNodes(node));
                node = node.previousSibling;
              }
            }
            return nodes.reverse();
          } else {
            return node;
          }
        };
        return nodeContainer.map(function() {
          return self.flatten(getTextNodes(this));
        });
    };

    $.TempJSON.prototype.getTextNodesFromRange = function(node) {
      var end, start, textNodes, _ref;
      var self = this;
      textNodes = self.getTextNodes(jQuery(node.commonAncestorContainer));
      _ref = [textNodes.index(node.start), textNodes.index(node.end)], start = _ref[0], end = _ref[1];
      return jQuery.makeArray(textNodes.slice(start, +end + 1 || 9e9));
    };

    $.TempJSON.prototype.text = function(node) {
        var self = this;
          return ((function() {
            var _i, _len, _ref, _results;
            _ref = self.getTextNodesFromRange(node);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              node = _ref[_i];
              _results.push(node.nodeValue);
            }
            return _results;
          }).call(this)).join('');
    }

    Object.defineProperty($.TempJSON, 'name', {
        value: "TempJSON"
    });
    $.storage.push($.TempJSON);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
