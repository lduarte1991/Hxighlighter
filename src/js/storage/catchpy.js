var xpathrange = xpathrange ? xpathrange : require('xpath-range');
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
            jQuery.each(result.rows.reverse(), function(_, ann) {
                var waAnnotation = self.convertFromWebAnnotation(ann, jQuery(element).find('.annotator-wrapper'));
                //console.log(waAnnotation);
                setTimeout(function() {
                    $.publishEvent('annotationLoaded', self.instance_id, [waAnnotation]);
                    $.publishEvent('TargetAnnotationDraw', self.instance_id, [waAnnotation]);
                }, 250);
            });
        }
        self.search(opts, callB);
    };

    $.CatchPy.prototype.search = function(options, callBack) {
        var self = this;
        var data = jQuery.extend({}, {
            limit: -1,
            offset: 0,
            source_id: self.options.object_id,
            context_id: self.options.context_id,
            collection_id: self.options.collection_id,
        }, options);
        jQuery.ajax({
            url: self.url_base,
            method: 'GET',
            data: data,
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                callBack(result);
            },
            error: function(xhr, status, error) {
                console.log(xhr, status, error);
                callBack([xhr, status, error]);
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
        jQuery.ajax({
            url: self.url_base + save_ann['id'] + '/',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(save_ann),
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                console.log('ANNOTATION SAVED', result);
            },
            error: function(xhr, status, error) {
                console.log(xhr, status, error);
            }
        });
    };

    $.CatchPy.prototype.StorageAnnotationDelete = function(ann_to_delete, elem) {
        var self = this;
        jQuery.ajax({
            url: self.url_base + ann_to_delete['id']+'?catchpy=true&resource_link_id=' + self.options.storageOptions.database_params.resource_link_id,
            method: 'DELETE',
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                console.log('ANNOTATION_DELETED', result)
            }
        })
    };

    $.CatchPy.prototype.StorageAnnotationUpdate = function(ann_to_update, elem) {
        var self = this;
        var save_ann = self.convertToWebAnnotation(ann_to_update, jQuery(elem).find('.annotator-wrapper'));
        jQuery.ajax({
            url: self.url_base + ann_to_update.id + '/',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(save_ann),
            headers: {
                'x-annotator-auth-token': self.options.storageOptions.token,
            },
            success: function(result) {
                console.log('ANNOTATION_UPDATED', result)
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
        if (annotation.media === "Annotation") {
            jQuery.each(annotation.ranges, function(_, range){
                targetList.push({
                    'type': 'Annotation',
                    'source': range.parent
                })
                source_id = range.parent;
            });

            purpose = 'replying';
        } else {
            // console.log('convert2wa', annotation.ranges, elem);
            var serializedRanges = self.serializeRanges(annotation.ranges, elem);
            var mediatype = this.options.mediaType.charAt(0).toUpperCase() + this.options.mediaType.slice(1);
            jQuery.each(serializedRanges.serial, function(index, range){
                targetList.push({
                    'source': 'http://sample.com/fake_content/preview',
                    'type': mediatype,
                    'selector': {
                        'type': 'Choice',
                        'items': [{
                                'type': 'RangeSelector',
                                'startSelector': {
                                    'type': 'XPathSelector',
                                    'value': range.start
                                },
                                'endSelector': {
                                    'type': 'XPathSelector',
                                    'value': range.end,
                                },
                                'refinedBy': {
                                    'type': 'TextPositionSelector',
                                    'start': range.startOffset,
                                    'end': range.endOffset,
                                }
                            }, {
                                'type': 'TextPositionSelector',
                                'start': serializedRanges.extra[index].startOffset,
                                'end': serializedRanges.extra[index].endOffset,
                            }, {
                                'type': 'TextQuoteSelector',
                                'exact': serializedRanges.extra[index].exact,
                                'prefix': serializedRanges.extra[index].prefix,
                                'suffix': serializedRanges.extra[index].suffix
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
        }
        return annotation;
    };

    $.CatchPy.prototype.getMediaType = function(webAnn, element) {
        return webAnn['target']['items'][0]['type'];
    };

    $.CatchPy.prototype.getAnnotationTargetItems = function(webAnn) {
        try {
            // console.log("reached getAnnotationTargetItems", webAnn);
            if (webAnn['target']['items'][0]['type'] == "Annotation") {
                // console.log([{'parent':webAnn['target']['items'][0]['source']}]);
                return [{'parent':webAnn['target']['items'][0]['source']}]
            }
            // console.log("nope, something went wrong");
            return webAnn['target']['items'][0]['selector']['items'];
        } catch(e) {
            console.log(e);
            return [];
        }
    };

    $.CatchPy.prototype.getAnnotationTarget = function(webAnn, element) {
        var self = this;
        try {
            var ranges = []
            jQuery.each(this.getAnnotationTargetItems(webAnn), function(_, targetItem) {
                // console.log('targetItem', targetItem);
                if (!('parent' in targetItem)) {
                    if (targetItem['type'] == "RangeSelector") {
                        ranges.push({
                            start: targetItem['startSelector'].value,
                            startOffset: targetItem['refinedBy'][0].start,
                            end: targetItem['endSelector'].value,
                            endOffset: targetItem['refinedBy'][0].end
                        });
                    }
                } else {
                    return ranges.push(targetItem)
                }
            });
            if (webAnn['target']['items'][0]['type'] == "Annotation") {
                return ranges;
            }
            // console.log('getAnnotationTarget', ranges, element);
            return self.normalizeRanges(ranges, element[0]);
        } catch(e) {
            console.log(ranges, element[0]);
                throw(e);
            console.log(ranges, element[0], this.getAnnotationTargetItems(webAnn));
            //return self.normalizeRanges(ranges, window.document);
            console.log(e);
            return []
        }
    };

    $.CatchPy.prototype.getAnnotationText = function(webAnn) {
        try {
            var found = [];
            jQuery.each(webAnn['body']['items'], function(_, bodyItem) {
                if (bodyItem.purpose == "commenting") {
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

            extraRanges.push(fullTextRange);
            try {
                // console.log("Used annotator way to serialize");
                serializedRanges.push(r.serialize(contextEl, '.annotator-hl'));
            } catch(e) {
                console.log(r, contextEl);
                throw(e);
                // console.log("Used new xpathrange way to serialize");
                serializedRanges.push(xpathrange.Range.sniff(r).serialize(contextEl, '.annotator-hl'));
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
                foundRange = xpathrange.Range.sniff(range);
                foundRange = foundRange.normalize(elem);
            // } catch(e) {
            //     console.log("trying toRange");
            //     var foundRange = xpathrange.toRange(range.start, range.startOffset, range.end, range.endOffset, elem);
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
