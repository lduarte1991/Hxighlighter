(function($) {
    $.HxighlighterEndpoint = function(options) {
        jQuery.extend(this, {
            token:     null,
            prefix:    null,
            params:    "",
            dfd:       null,
            context_id: "None",
            collection_id: "None",
            userid:    "test@mirador.org",
            username:  "mirador-test",
            annotationsList: [],        //OA list for Mirador use
            annotationsListCatch: null,  //internal list for module use
            windowID: null,
            eventEmitter: null
        }, options);

        this.init();
    };

    $.HxighlighterEndpoint.prototype = {
        init: function() {
            this.catchOptions = {
                user: {
                    id: this.userid,
                    name: this.username
                },
                permissions: {
                    'read': [],
                    'update': [this.userid],
                    'delete': [this.userid],
                    'admin': [this.userid]
                }
            };
        },
        set: function(prop, value, options){
            if (options) {
                this[options.parent][prop] = value;
            } else {
                this[prop] = value
            }
        },
        search: function(searchOptions, successCallback, errorCallback){
            var self = this;
            var options = searchOptions;
            if (options.uri) {
                options.source_id = options.uri;
            }
            Hxighlighter.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(result, converter) {
                if (typeof successCallback === "function") {
                    successCallback(result);
                } else {
                    self.annotationsListCatch = result.rows;
                    console.log(result.rows);
                    jQuery.each(self.annotationsListCatch, function(index, value) {
                        self.annotationsList.push(self.getAnnotationInOA(value));
                    });
                    console.log(self.annotationsList);
                    self.dfd.resolve(true);
                    self.eventEmitter.publish('catchAnnotationsLoaded.' + self.windowID, self.annotationsListCatch.map(converter));
                    self.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {
                        windowId: self.windowID,
                        annotationsList: self.annotationsList,
                    });
                }
                
            }, function() {
                if (typeof errorCallback === "function") {
                    errorCallback();
                } else {
                    console.log("There was an error searching this endpoint");
                }
            }]);
        },
        deleteAnnotation: function(annotationID, successCallback, errorCallback) {
            var self = this;
            var foundAnn = self.annotationsListCatch.filter(function(ann) {
                if (ann.id === annotationID) {
                    return ann;
                }
            });
            Hxighlighter.publishEvent('StorageAnnotationDelete', self.instance_id, foundAnn);
            self.eventEmitter.publish('catchAnnotationDeleted.' + self.windowID, annotationID);
        },
        update: function(oaAnnotation, successCallback, errorCallback){},
        create: function(oaAnnotation, successCallback, errorCallback){
            var self = this;
            console.log(oaAnnotation);
            var endpointAnnotation = self.getAnnotationInEndpoint(oaAnnotation);
            console.log("original annotation", endpointAnnotation);
            Hxighlighter.publishEvent('StorageAnnotationSave', self.instance_id, [endpointAnnotation, function(data) {
                console.log("Successful callback for Storage Annotation Save", data, self.getAnnotationInOA(data));
                self.eventEmitter.publish('catchAnnotationCreated.' + self.windowID, data);
                console.log("Should have drawn annotation");
                if (typeof successCallback === "function") {
                    successCallback(self.getAnnotationInOA(data));
                }
            }, function() {
                console.log("Something went terribly wrong");
                if (typeof errorCallback === "function") {
                    errorCallback();
                }
                
            }]);
        },
        createCatchpyAnnotation: function(catchAnnotation, successCallback, errorCallback){},
        userAuthorize: function(action, annotation) {
            return true;
        },
        getAnnotationInOA: function(annotation) {
            var id,
            motivation = [],
            resource = [],
            on,
            annotatedBy,
            self = this;
            id = annotation.id;
            var bodyItems = annotation.body.items;
            var targetItems = annotation.target.items;
            var tagItems = bodyItems.filter(function(item) {
                if (item.purpose == "tagging") {
                    return item;
                }
            });
            var annotationTextItems = bodyItems.filter(function(item) {
                if (item.purpose == "commenting") {
                    return item;
                }
            });
            var parentItem = targetItems.filter(function(item) {
                if (item.type == "Annotation") {
                    return item;
                }
            });

            var targetItem = targetItems.filter(function(item) {
                if (item.type === "Image") {
                    return item;
                }
            })
            if (tagItems.length > 0) {
                motivation.push("oa:tagging");
                jQuery.each(tagItems, function(index, item) {
                    resource.push({
                        "@type": "oa:Tag",
                        "chars": item.value
                    })
                });
            }
            if (parentItem.length > 0) {
                motivation.push("oa:replying");
                on = parentItem[0].value;  //need to make URI
            } else {
                var value; 
                motivation.push("oa:commenting");
                var default_value = "";
                var item_value = "";
                jQuery.each(targetItem[0].selector.items, function(idx, choice) {
                    console.log(choice);
                    if (choice.type === "FragmentSelector") {
                        default_value = choice.value;
                    } else if (choice.type === "SvgSelector") {
                        item_value = choice.value;
                    } else if (choice["@type"] === "oa:SpecificResource") {
                        default_value = choice.selector.default.value;
                        item_value = choice.selector.item.value;
                    }
                });
                on = [{
                    "@type": "oa:SpecificResource",
                    "full": targetItem[0].source,
                    "within": {
                        "@id": self.manifest_url,
                        "@type": "sc:Manifest"
                    },
                    "selector": {
                        "@type": 'oa:Choice',
                        default: {
                            "@type": "oa:FragmentSelector",
                            "value": default_value
                        },
                        "item": {
                            "@type": "oa:SvgSelector",
                            "value": item_value
                        } 
                    }
                }]
            }

            resource.push({
                "@type": "dctypes:Text",
                "format": "text/html",
                "chars": annotationTextItems.map(function(item) { return item.value; }).join("<p></p>") 
            });

            annotatedBy = {
                "@id": annotation.creator.id,
                "name": annotation.creator.name
            };

            var oaAnnotation = {
                "@context" : "http://iiif.io/api/presentation/2/context.json",
                "@id" : String(id),
                "@type" : "oa:Annotation",
                "motivation" : motivation,
                "resource" : resource,
                "on" : on,
                "annotatedBy" : annotatedBy,
                "annotatedAt" : annotation.created,
                "permissions" : annotation.permissions,
                "endpoint" : this
            };
            return oaAnnotation;
        },
        getThumbnailFromFragmentSelector: function(fragmentSelector, uri) {
            var self = this;
            var nums = fragmentSelector.replace('xywh=', '');
            split_nums = nums.split(',');
            console.log(self.imagesList, uri);
            var canvas = self.imagesList[$.getImageIndexById(self.imagesList, uri)];
            var imageUrl = $.getThumbnailForCanvas(canvas, 300);
            imageUrl = imageUrl.replace('full', split_nums[0] +','+ split_nums[1] +','+ split_nums[2] +','+ split_nums[3]);
            return imageUrl;
        },
        getAnnotationInEndpoint: function(oaAnnotation){
            var self = this;
            var target = {
                type: "Choice",
                items: []
            }
            var rangeVals = oaAnnotation.on.forEach(function(targetItem) {
                var uri = targetItem.full;
                target.items.push({
                    type: "Image",
                    source: uri,
                    selector: {
                        items: [targetItem],
                        type: "List"
                    }
                });
                target.items.push({
                    type: "Thumbnail",
                    format: "image/jpg",
                    source: self.getThumbnailFromFragmentSelector(targetItem.selector.default.value, uri)
                })
            });

            var text = [];
            var tags = [];
            oaAnnotation.resource.forEach(function(bodyItem) {
                if (bodyItem['@type'] === "dctypes:Text") {
                    text.push(bodyItem.chars);
                } else if (bodyItem['@type'] === "oa:Tag") {
                    tags.push(bodyItem.chars)
                }
            });

            var annotation = {
                annotationText: text,
                created: new Date(),
                creator: {
                    id: self.userid,
                    name: self.username,
                },
                exact: "",
                id: Hxighlighter.getUniqueId(),
                media: "Image",
                permissions: {
                    can_read: [],
                    can_update: [self.userid],
                    can_delete: [self.userid],
                    can_admin: [self.userid]
                },
                ranges: [target],
                tags: tags,
                totalReplies: 0
            }
            return annotation;
        },
    }
}(Mirador));