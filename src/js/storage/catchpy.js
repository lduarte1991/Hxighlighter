//var xpathrange = xpathrange ? xpathrange : require('xpath-range');
var hrange = require('../h-range.js');
(function($) {
    $.CatchPy = function(options, inst_id) {
        this.options = options;
        //console.log(options);
        this.instance_id = inst_id;
        this.store = [];
        this.url_base = options.storageOptions.external_url.catchpy;
        //console.log(this.url_base);
    };


    $.CatchPy.prototype.onLoad = function(element, opts) {
        var self = this;
        var callB = function(result) {
            jQuery.each(result.rows, function(_, ann) {
                var waAnnotation = self.convertFromWebAnnotation(ann, jQuery(element).find('.annotator-wrapper'));
                //console.log(waAnnotation);
                setTimeout(function() {
                    // console.log('definitely getting to here');
                    $.publishEvent('annotationLoaded', self.instance_id, [waAnnotation]);
                    $.publishEvent('TargetAnnotationDraw', self.instance_id, [waAnnotation]);
                }, 250);
            });
        }
        self.search(opts, callB, function(errs) {
            //console.log("Error", errs);
        });
    };

    $.CatchPy.prototype.search = function(options, callBack, errfun) {
        var self = this;
        var data = jQuery.extend({}, {
            limit: self.options.storageOptions.pagination,
            offset: 0,
            source_id: self.options.object_id,
            context_id: self.options.context_id,
            collection_id: self.options.collection_id,
            resource_link_id: self.options.storageOptions.database_params.resource_link_id,
            utm_source: self.options.storageOptions.database_params.utm_source
        }, options);
        var params = '?resource_link_id=' + this.options.storageOptions.database_params.resource_link_id
        params += '&utm_source=' + this.options.storageOptions.database_params.utm_source
        params += '&version=' + this.options.storageOptions.database_params.version
        jQuery.ajax({
            url: self.url_base + params,
            method: 'GET',
            data: data,
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                $.totalAnnotations = result.total;
                callBack(result, self.convertFromWebAnnotation.bind(self));
            },
            error: function(xhr, status, error) {
                if (xhr.status === 401) {
                    $.publishEvent('HxAlert', self.instance_id, ["You do not have permission to access the database. If refreshing page does not work contact instructor. (Error code 401)", {buttons:[], time:5}])
                } else if (xhr.status === 500) {
                    $.publishEvent('HxAlert', self.instance_id, ["Annotations Server is down for maintanence. Wait 10 minutes and try again. (Error code 500)", {time: 0, modal: true}])
                } else if (xhr.status == 403) {
                    $.publishEvent('HxAlert', self.instance_id, ["I'm sorry, I'm afraid I cannot let you do that. User not authorized to perform action. (Error code 403)", {buttons:[], time:5}])
                } else {
                    if (self.options.instructors.indexOf(self.options.user_id) !== -1) {
                        if (xhr.status === 409) {
                            $.publishEvent('HxAlert', self.instance_id, ["If importing annotations check that user_id of the annotation matches your own. (Error code 409)", {time: 0, modal: true}])
                        } else if (xhr.status === 422) {
                            $.publishEvent('HxAlert', self.instance_id, ["If importing, something critical was removed in the process. (Error code 422)", {time: 0, modal: true}])
                        } 
                    } else {
                        $.publishEvent('HxAlert', self.instance_id, ['Unknown Error. Your annotations were not saved. Copy them elsewhere to prevent loss. Notify instructor. (Error code ' + xhr.status + ')', {time: 0}]);
                    }
                }
                errfun([xhr, status, error]);
            }
        });

    }

    $.CatchPy.prototype.StorageAnnotationSave = function(ann_to_save, elem, updating) {
        var self = this;
        if (updating) {
            self.StorageAnnotationUpdate(ann_to_save, elem);
            return;
        }
        var save_ann = self.convertToWebAnnotation(ann_to_save, jQuery(elem).find('.annotator-wrapper'));
        var params = '?resource_link_id=' + this.options.storageOptions.database_params.resource_link_id
        params += '&utm_source=' + this.options.storageOptions.database_params.utm_source
        params += '&version=' + this.options.storageOptions.database_params.version
        jQuery.ajax({
            url: self.url_base + save_ann['id'] + params,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(save_ann),
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                //console.log('ANNOTATION SAVED', result);
            },
            error: function(xhr, status, error) {
                //console.log(xhr, status, error);
                if (xhr.status === 401) {
                    $.publishEvent('HxAlert', self.instance_id, ["You do not have permission to access the database. Refreshing the page might reactivate your permissions. (Error code 401)", {buttons:[], time:5}])
                } else if (xhr.status === 500) {
                    $.publishEvent('HxAlert', self.instance_id, ["Annotations Server is down for maintanence. Wait 10 minutes and try again. (Error code 500)", {time: 0, modal: true}])
                } else {
                    $.publishEvent('HxAlert', self.instance_id, ['Unknown Error. Your annotations were not saved. Copy them elsewhere to prevent loss. Notify instructor.', {time: 0}]);
                }
            }
        });
    };

    $.CatchPy.prototype.StorageAnnotationDelete = function(ann_to_delete, elem) {
        var self = this;
        var params = '&resource_link_id=' + this.options.storageOptions.database_params.resource_link_id
        params += '&utm_source=' + this.options.storageOptions.database_params.utm_source
        params += '&version=' + this.options.storageOptions.database_params.version
        params += '&collection_id=' + this.options.collection_id
        jQuery.ajax({
            url: self.url_base + ann_to_delete['id']+'?catchpy=true' + params,
            method: 'DELETE',
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                //console.log('ANNOTATION_DELETED', result)
            },
            error: function(xhr, status, error) {
                if (xhr.status === 401) {
                    $.publishEvent('HxAlert', self.instance_id, ["You do not have permission to access the database. Refreshing the page might reactivate your permissions. (Error code 401)", {buttons:[], time:5}])
                } else if (xhr.status === 500) {
                    $.publishEvent('HxAlert', self.instance_id, ["Annotations Server is down for maintanence. Wait 10 minutes and try again. (Error code 500)", {time: 0, modal: true}])
                } else {
                    $.publishEvent('HxAlert', self.instance_id, ['Unknown Error. Your annotations were not saved. Copy them elsewhere to prevent loss. Notify instructor.', {time: 0}]);
                }
            }
        })
    };

    $.CatchPy.prototype.StorageAnnotationUpdate = function(ann_to_update, elem) {
        var self = this;
        var save_ann = self.convertToWebAnnotation(ann_to_update, jQuery(elem).find('.annotator-wrapper'));
        var params = '?resource_link_id=' + this.options.storageOptions.database_params.resource_link_id
        params += '&utm_source=' + this.options.storageOptions.database_params.utm_source
        params += '&version=' + this.options.storageOptions.database_params.version
        jQuery.ajax({
            url: self.url_base + ann_to_update.id + params,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(save_ann),
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                //console.log('ANNOTATION_UPDATED', result)
            },
            error: function(xhr, status, error) {
                if (xhr.status === 401) {
                    $.publishEvent('HxAlert', self.instance_id, ["You do not have permission to access the database. Refreshing the page might reactivate your permissions. (Error code 401)", {buttons:[], time:5}])
                } else if (xhr.status === 500) {
                    $.publishEvent('HxAlert', self.instance_id, ["Annotations Server is down for maintanence. Wait 10 minutes and try again. (Error code 500)", {time: 0, modal: true}])
                } else {
                    $.publishEvent('HxAlert', self.instance_id, ['Unknown Error. Your annotations were not saved. Copy them elsewhere to prevent loss. Notify instructor.', {time: 0}]);
                }
            }
        })
    };

    $.CatchPy.prototype.convertToWebAnnotation = function(annotation, elem) {
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
            source_id = annotation.ranges.source;
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
                targetList.push({
                    'source': 'http://sample.com/fake_content/preview',
                    'type': mediatype,
                    'selector': {
                        'type': 'Choice',
                        'items': [{
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
                        }],
                    }
                });
            });
        }

        var webAnnotationVersion = {
            "@context": "http://catchpy.harvardx.harvard.edu.s3.amazonaws.com/jsonld/catch_context_jsonld.json",
            'type': 'Annotation',
            'schema_version': '1.1.0',
            'id': annotation['id'],
            'creator':  {
                'id': self.options.user_id,
                'name': this.options.username,
            },
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
                'items': [{
                    'type': 'TextualBody',
                    'format': 'text/html',
                    'language': 'en',
                    'value': annotation.annotationText,
                    'purpose': purpose
                }].concat(tags),
            },
            'target': {
                'type': 'List',
                'items': targetList
            }
        };
        return webAnnotationVersion;
    };

    $.CatchPy.prototype.convertFromWebAnnotation = function(webAnn, element) {
        var self = this;
        var annotation = {
            annotationText: self.getAnnotationText(webAnn),
            created: self.getAnnotationCreated(webAnn),
            creator: self.getAnnotationCreator(webAnn),
            exact: self.getAnnotationExact(webAnn),
            id: self.getAnnotationId(webAnn),
            media: self.getMediaType(webAnn),
            tags: self.getAnnotationTags(webAnn),
            ranges: self.getAnnotationTarget(webAnn, jQuery(element)),
            totalReplies: webAnn.totalReplies,
            permissions: webAnn.permissions,
        }
        return annotation;
    };

    $.CatchPy.prototype.getMediaType = function(webAnn, element) {
        return webAnn['target']['items'][0]['type'];
    };

    $.CatchPy.prototype.getAnnotationTargetItems = function(webAnn) {
        try {
            console.log("reached getAnnotationTargetItems", webAnn);
            if (webAnn['target']['items'][0]['type'] == "Annotation") {
                // console.log([{'parent':webAnn['target']['items'][0]['source']}]);
                return [{'parent':webAnn['target']['items'][0]['source']}]
            }
            //console.log("nope, something went wrong");
            return webAnn['target']['items'][0]['selector']['items'];
        } catch(e) {
            console.log(e);
            return [];
        }
    };

    $.CatchPy.prototype.getAnnotationTarget = function(webAnn, element) {
        var self = this;
        try {
            var ranges = [];
            var xpathRanges = [];
            var positionRanges = [];
            var textRanges = [];
            jQuery.each(this.getAnnotationTargetItems(webAnn), function(_, targetItem) {
                if (!('parent' in targetItem)) {
                    if (targetItem['type'] === "RangeSelector") {
                        console.log("Reached RangeSelector", targetItem);
                        xpathRanges.push({
                            start: targetItem['startSelector'] ? targetItem['startSelector'].value : targetItem['oa:start'].value,
                            startOffset: targetItem['refinedBy'][0].start,
                            end: targetItem['endSelector'] ? targetItem['endSelector'].value : targetItem['oa:end'].value,
                            endOffset: targetItem['refinedBy'][0].end
                        });
                    } else if (targetItem['type'] === "TextPositionSelector") {
                        positionRanges.push({
                            globalStartOffset: targetItem['start'],
                            globalEndOffset: targetItem['end'] 
                        });
                    } else if (targetItem['type'] === "TextQuoteSelector") {
                        textRanges.push({
                            prefix: targetItem['prefix'] || '',
                            exact: targetItem['exact'],
                            suffix: targetItem['suffix'] || ''
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
            } else {
                var rangeFound = {}
                if (xpathRanges.length >= 1) {
                    rangeFound['xpath'] = xpathRanges[0];
                }
                if (positionRanges.length >= 1) {
                    rangeFound['position'] = positionRanges[0];
                }
                if (textRanges.length >= 1) {
                    rangeFound['text'] = textRanges[0];
                }
                ranges.push(rangeFound)
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

    $.CatchPy.prototype.getAnnotationText = function(webAnn) {
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

    $.CatchPy.prototype.getAnnotationCreated = function(webAnn) {
        try {
            return new Date(webAnn['created']);
        } catch(e) {
            return new Date();
        }
    }

    $.CatchPy.prototype.getAnnotationCreator = function(webAnn) {
        try {
            return webAnn['creator'];
        } catch(e) {
            return {name:'Unknown', id:'error'};
        }
    };

    $.CatchPy.prototype.getAnnotationExact = function(webAnn) {
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

    $.CatchPy.prototype.getAnnotationId = function(webAnn) {
        try {
            return webAnn['id'];
        } catch(e) {
            return "";
        }
    };


    $.CatchPy.prototype.getAnnotationTags = function(webAnn) {
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

    $.CatchPy.prototype.storeCurrent = function() {
        
    };

    $.CatchPy.prototype.serializeRanges = function(ranges, elem) {
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

    $.CatchPy.prototype.normalizeRanges = function(ranges, elem) {
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

    $.CatchPy.prototype.getElementViaXpath = function(xpath, rootElem) {
        var res = document.evaluate('.' + xpath, jQuery(rootElem)[0], null, XPathResult.ANY_TYPE, null);
        return res.iterateNext();
    };

    $.CatchPy.prototype.contains = function(elem1, elem2) {
        if (document.compareDocumentPosition != null) {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY;
      }
      return false;
    };

    $.CatchPy.prototype.flatten = function(array) {
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

    $.CatchPy.prototype.getTextNodes = function(nodeContainer) {
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

    $.CatchPy.prototype.getTextNodesFromRange = function(node) {
      var end, start, textNodes, _ref;
      var self = this;
      textNodes = self.getTextNodes(jQuery(node.commonAncestorContainer));
      _ref = [textNodes.index(node.start), textNodes.index(node.end)], start = _ref[0], end = _ref[1];
      return jQuery.makeArray(textNodes.slice(start, +end + 1 || 9e9));
    };

    $.CatchPy.prototype.text = function(node) {
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
    $.storage.push($.CatchPy);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
