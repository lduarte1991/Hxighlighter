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
            eventEmitter: null,
            first: true,
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
            this.setUpListeners();
        },
        setUpListeners: function() {
            var self = this;
            Hxighlighter.subscribeEvent('convertToEndpoint', '', function(_, oAnnotation, callBack) {
                var found = self.annotationsListCatch.find(function(ann) {
                    return oAnnotation['@id'] === ann.id;
                })
                if (found) {
                    return callBack(found);
                } else {
                    callBack(self.getAnnotationInEndpoint(oAnnotation));
                }
            });
            Hxighlighter.subscribeEvent('drawFromSearch', '', function(_, anns, converter) {
                self.drawFromSearch(anns, converter);
            });
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
            if (self.first) {
                self.first = false;
                return;
            }
            var self = this;
            var options = searchOptions;
            if (options.uri) {
                options.source_id = options.uri;
            }
            Hxighlighter.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(result, converter) {
                if (typeof successCallback === "function") {
                    successCallback(result);
                } else {
                    self.drawFromSearch(result.rows, converter);
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
            // console.log(self.annotationsListCatch, foundAnn);

            self.annotationsList = self.annotationsList.filter(function(oaAnn) {
                if (oaAnn['@id'] !== annotationID) {
                    return oaAnn;
                }
            });

            //foundAnn.push(successCallback, errorCallback);
            // console.log("Deleting: ", annotationID, self.annotationsList, foundAnn);
            //Hxighlighter.publishEvent('StorageAnnotationDelete', self.instance_id, foundAnn);
            self.eventEmitter.publish('catchAnnotationDeleted.' + self.windowID, {
                annotation: foundAnn[0],
                success: successCallback,
                error: errorCallback
            });
        },
        update: function(oaAnnotation, successCallback, errorCallback){
            // console.log("Calls Update in m2-hxighlighter-endpoint")
            var self = this;
            // console.log('1. Mirador creates OA: ', oaAnnotation);
            var endpointAnnotation = self.getAnnotationInEndpoint(oaAnnotation);
            // console.log('2. Endpoint converts to Hxighlighter data model: ', endpointAnnotation)
            Hxighlighter.publishEvent('StorageAnnotationUpdate', self.instance_id, [endpointAnnotation, function(data) {
                // console.log("Successful callback for Storage Annotation Save", data);
                self.eventEmitter.publish('catchAnnotationUpdated.' + self.windowID, data);
                // console.log("Should have drawn annotation");
                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            }, function() {
                // console.log("Something went terribly wrong");
                if (typeof errorCallback === "function") {
                    errorCallback();
                }
            }]);
        },
        create: function(oaAnnotation, successCallback, errorCallback){
            var self = this;
            // console.log('1. Mirador creates OA: ', oaAnnotation);
            var endpointAnnotation = self.getAnnotationInEndpoint(oaAnnotation);
            // console.log("2. Endpoint converts to Hxighlighter data model", endpointAnnotation);
            Hxighlighter.publishEvent('StorageAnnotationSave', self.instance_id, [endpointAnnotation, function(data) {
                // console.log("Successful callback for Storage Annotation Save", data, self.getAnnotationInOA(data));
                self.eventEmitter.publish('catchAnnotationCreated.' + self.windowID, data);
                // console.log("Should have drawn annotation");
                self.annotationsList.push(self.getAnnotationInOA(data));
                self.annotationsListCatch.push(data);
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
            var self = this;
            return true;
            if (typeof(annotation) !== undefined && typeof(annotation.permissions) !== "undefined")  {
                var permissions = annotation.permissions;
                return self.instructors.indexOf(self.userid) > -1 || permissions['can_' + action].indexOf(self.userid) > -1;
            } else {
                return true;
            }
            
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
                    if (choice.type === "FragmentSelector") {
                        default_value = choice.value;
                    } else if (choice.type === "SvgSelector") {
                        item_value = choice.value.replace('&quot;strokeWidth&quot;:1,&quot;', '&quot;strokeWidth&quot;:2.5,&quot;');
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
            var canvas = self.imagesList[$.getImageIndexById(self.imagesList, uri)];
            var scale = '/300,/'
            var fragmentwidth = parseInt(split_nums[2], 10);
            var fragmentHeight = parseInt(split_nums[3], 10);
            if (fragmentwidth > fragmentHeight) {
                if (fragmentwidth < 300) {
                    scale = '/' + fragmentwidth + ',/';
                }
            } else {
                scale = '/,150/'
                if (fragmentHeight < 150) {
                    scale = '/,' + fragmentHeight + '/';
                }
            }
            var imageUrl = $.getThumbnailForCanvas(canvas, 300);
            imageUrl = imageUrl.replace('full', split_nums[0] +','+ split_nums[1] +','+ split_nums[2] +','+ split_nums[3]);
            imageUrl = imageUrl.replace('/,150/', scale).replace('/300,/', scale);
            return imageUrl;
        },
        getAnnotationInEndpoint: function(oaAnnotation){
            var self = this;
            var target = {
                type: "Choice",
                items: []
            }
            var thumbnail_url = "";
            var uri = "";
            var svgVal = "";
            var annotation_id = oaAnnotation['@id'] || Hxighlighter.getUniqueId();
            var rangeVals = oaAnnotation.on.forEach(function(targetItem) {
                uri = targetItem.full;
                target.items.push({
                    type: "Image",
                    source: uri,
                    selector: {
                        items: [targetItem],
                        type: "Choice"
                    }
                });

                thumbnail_url = self.getThumbnailFromFragmentSelector(targetItem.selector.default.value, uri)
                svgVal = targetItem.selector.item.value
                svgVal = svgVal.replace('svg xmlns', 'svg class="thumbnail-svg-' + annotation_id + '" viewBox="' + targetItem.selector.default.value.replace('xywh=', '').split(',').join(' ') + '"')
                var re = /\/([0-9-]+,[0-9-]+,[0-9-]+,[0-9-]+)\//;
                var matches = thumbnail_url.match(re)
                var coords = matches[1].split(',');
                coords = coords.map(function(x){
                    return parseInt(x, 10) < 0 ? 0 : x;
                });
                thumbnail_url = thumbnail_url.replace(matches[0], "/" + coords.join(',') + "/");
                target.items.push({
                    type: "Thumbnail",
                    format: "image/jpg",
                    source: thumbnail_url
                });
                // console.log("Found: " + target.items)
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
                id: annotation_id,
                media: "Image",
                permissions: {
                    can_read: [],
                    can_update: [self.userid],
                    can_delete: [self.userid],
                    can_admin: [self.userid]
                },
                thumbnail: thumbnail_url,
                source_url: uri,
                ranges: [target],
                tags: tags,
                svg: svgVal,
                totalReplies: 0
            }
            // console.log("Should return following:", annotation);
            return annotation;
        },
        drawFromSearch: function(result, converter) {
            var self = this;
            self.annotationsListCatch = [];
            self.annotationsList = [];
            jQuery.each(result, function(index, value) {
                self.annotationsList.push(self.getAnnotationInOA(value));
            });

            self.annotationsListCatch = result.map(converter);
            self.dfd.resolve(true);
            self.eventEmitter.publish('catchAnnotationsLoaded.' + self.windowID, self.annotationsListCatch);
            self.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {
                windowId: self.windowID,
                annotationsList: self.annotationsList,
            });
        }
    }
}(Mirador));