/*
 *
 *
 */

require('./plugins/hx-sidebar-tag-tokens.js');
require('./plugins/hx-adminbutton.js');
require('./viewers/sidebar.js');
require('./plugins/hx-permissions.js');
require('./plugins/hx-alert.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/m2-editor-plugin.js');
require('./plugins/m2-hxighlighter-endpoint.js');
require('./storage/catchpy.js');

(function($) {

    /**
     * { function_description }
     *
     * @class      TextTarget (name)
     * @param      {<type>}  options  The options
     * @param      {<type>}  inst_id  The instance identifier
     */
    $.ImageTarget = function(options, inst_id) {
        this.options = options;
        this.instance_id = inst_id;
        this.guid = undefined;
        console.log("should be loading image");
        this.annotation_selector = 'hx-annotation-hl';
        this.init();
    };

    /**
     * { function_description }
     */
    $.ImageTarget.prototype.init = function () {
        var self = this;
        // this target is only meant to work with text/html objects
        this.media = "image";
        this.setUpListeners();

        if (this.options.method == "manifest") {
            console.log("Loading manifest...", this.options.manifest_url)
            this.createImageSlotFromManifest(this.options.manifest_url);
        }

        function areScrollbarsVisible() {
            var scrollableElem = document.createElement('div'),
                innerElem = document.createElement('div');
            scrollableElem.style.width = '30px';
            scrollableElem.style.height = '30px';
            scrollableElem.style.overflow = 'scroll';
            scrollableElem.style.borderWidth = '0';
            innerElem.style.width = '30px';
            innerElem.style.height = '60px';
            scrollableElem.appendChild(innerElem);
            document.body.appendChild(scrollableElem); // Elements only have width if they're in the layout
            var diff = scrollableElem.offsetWidth - scrollableElem.clientWidth;
            document.body.removeChild(scrollableElem);
            return diff > 0;
        }

        window.addEventListener('load', function() {
            // Show scrollbars if they're hidden.
            if (!areScrollbarsVisible()) {
                document.body.classList.add('force-show-scrollbars');
            }
        });

    };

    $.ImageTarget.prototype.createImageSlotFromManifest = function(manifest_url) {
        var self = this;
        self.mir = Mirador({
            "id": "viewer",
            'windowSettings' : {
                "availableViews" : ['ThumbnailsView', 'ImageView', 'ScrollView', 'BookView'], //any subset removes others
                "viewType" : 'ImageView', //one of [_'ThumbnailsView'_, 'ImageView', 'ScrollView', 'BookView'] - if using availableViews, must be in subset
                "canvasControls": {
                    "annotations": {
                        "annotationLayer": true,
                        "annotationCreation": true,
                        "annotationState": "on",
                    }
                },
            },
            "mainMenuSettings" : {
                'show' : false
            },
            buildPath: "dist/",
            "layout" : "1x1",
            "saveSession" : false,
            "data": [{'manifestUri': self.options.manifest_url, 'location': "Harvard University"}],
            "availableAnnotationStylePickers": [],
            "availableAnnotationDrawingTools": [
                'Rectangle', 'Ellipse', 'Freehand', 'Polygon'
            ],
            "windowObjects": [{
                "loadedManifest": self.options.manifest_url,
                "viewType" : "ImageView",
                "canvasID" : "https://www.e-codices.unifr.ch/metadata/iiif/sl-0002/canvas/bke-0020_e001.json",
                "annotationLayer" : true,
                "annotationCreation" : true,
                "sidePanel" : false,
                "bottomPanel": false,
                "fullScreen" : false,
                "displayLayout": false,
                "annotationEditorVisible": false,
                
            }],
            'annotationBodyEditor': {
              'module': 'SummernoteAnnotationBodyEditor',
              'options': {
                config: {
                }
              }
            },
            'annotationEndpoint': {
                'name': 'Hx',
                'module': 'HxighlighterEndpoint',
                'options': {
                    token: self.options.storageOptions.token,
                    prefix: 'https://devo.catchpy.harvardx.harvard.edu/annos',
                    params: '',
                    userid: self.options.user_id,
                    username: self.options.username,
                    roles: [],
                    collection_id: self.options.collection_id,
                    context_id: self.options.context_id,
                    instance_id: self.instance_id,
                    manifest_url: self.options.manifest_url,
                }
            }
            // 'annotationEndpoint': {
            //     'name': 'Catchpy',
            //     'module': 'CatchEndpoint',
            //     'options': {
            //         token: self.options.storageOptions.token,
            //         prefix: 'https://devo.catchpy.harvardx.harvard.edu/annos',
            //         params: '',
            //         userid: self.options.user_id,
            //         username: self.options.username,
            //         roles: [],
            //         collection_id: self.options.collection_id,
            //         context_id: self.options.context_id,
            //     }
            // }
        });
        $.publishEvent('targetLoaded', self.instance_id, [jQuery('#viewer')]);

        self.mir.eventEmitter.subscribe('windowAdded', function(event, windowId, slotAddress) {
            self.windowId = windowId.id;
            self.mir.eventEmitter.subscribe('catchAnnotationsLoaded.' + self.windowId , function (event) {
                var miradorAnnotations = Array.from(arguments);
                miradorAnnotations.shift();
                console.log(miradorAnnotations);
                jQuery.each(self.viewers, function(_, viewer) {
                    if (typeof(viewer.StorageAnnotationLoad) === "function") {
                        jQuery.each(miradorAnnotations, function(idx, hxAnnotation) {
                            $.publishEvent("annotationLoaded", self.instance_id, [hxAnnotation]);
                        });
                    }
                });
            });
            self.mir.eventEmitter.subscribe('annotationEditSave.' + self.windowId, function(event, miradorAnnotation) {
                console.log("what");
                var endpointAnnotation = miradorAnnotation.endpoint.getAnnotationInEndpoint(miradorAnnotation)[0];
                var annotation = self.convertFromOA(endpointAnnotation);
                jQuery.each(self.viewers, function(_, viewer) {
                    viewer.addAnnotation(annotation, true, false);
                });
            });

            self.mir.eventEmitter.subscribe('catchAnnotationDeleted.' + self.windowId, function(event, annotationId) {
                    $.publishEvent('StorageAnnotationDelete', self.instance_id, [{id: annotationId}, false]);
            });

            self.mir.eventEmitter.subscribe('catchAnnotationCreated.' + self.windowId, function(event, catchAnnotation) {
                var annotation = self.convertFromOA(catchAnnotation);
                jQuery.each(self.viewers, function(_, viewer) {
                    viewer.addAnnotation(annotation, false, false);
                });
            })

        });
    };

    $.ImageTarget.prototype.convertFromOA = function(miradorAnnotation) {
        var self = this;
        console.log(self.mir, miradorAnnotation);
        var annotation = {
            annotationText: [miradorAnnotation.text],
            created: miradorAnnotation.created,
            creator: miradorAnnotation.user,
            thumbnail: miradorAnnotation.thumb,
            id: miradorAnnotation.id,
            media: "image",
            tags: miradorAnnotation.tags,
            ranges: miradorAnnotation.rangePosition,
            totalReplies: miradorAnnotation.tags,
            permissions: miradorAnnotation.permissions,
            uri: miradorAnnotation.uri,
            //svg: miradorAnnotation.rangePosition[0].selector.item["@type"] === "oa:SvgSelector" ? self.setUpSvg(miradorAnnotation) : ""
        };
        return annotation;
    };

    $.ImageTarget.prototype.setUpSvg = function(item) {
        var self = this;
        var svgVal = item.rangePosition[0].selector.item.value;

        var leftmargin = "-150px";
        var widthHeight = 'width="150"';
        

        var width = parseFloat(item.bounds.width);
        var height = parseFloat(item.bounds.height);
        var strokewidth = (width * 0.00995) + "px"//'20px';
        if (height > width) {
            var recalc = 150.0*(width/height);
            leftmargin = "-" + recalc.toString() + 'px';
            widthHeight = 'height="150"';
        }
        if (width < 150 && height < 150) {
            widthHeight = 'width="' + width + '" height="' + height + '" ';
            leftmargin = "-" + item.bounds.width + "px";
            strokewidth = '2px';
        }
        
        var finalSvg = "";
        finalSvg += svgVal.replace('<svg xmlns', '<svg class="thumbnail-'+ item.id +'" id="thumbnail-' + item.id +'" ' + widthHeight + ' style="left: -9999px; position: absolute; margin-left: ' + leftmargin + '" viewBox="' + item.bounds.x + ' ' + item.bounds.y + ' ' + item.bounds.width + ' ' + item.bounds.height + '" xmlns').replace(/stroke-width=\".+?\"/g, 'stroke-width="' + strokewidth + '"');

        return finalSvg;
    }

    /**
     * { function_description }
     */
    $.ImageTarget.prototype.setUpListeners = function() {
        var self = this;

        jQuery('.toggle-alerts').click(function() {
            if(jQuery(this).hasClass('on')) {
                jQuery(this).html('Turn Alerts On');
                jQuery(this).removeClass('on');
                jQuery('.sr-alert').attr('aria-live', 'off');
            } else {
                jQuery(this).html('Turn Alerts Off');
                jQuery(this).addClass('on');
                jQuery('.sr-alert').attr('aria-live', 'polite');
            }
        })
        
        // once the target has been loaded, the selector can be instantiated
        $.subscribeEvent('targetLoaded', self.instance_id, function(_, element) {
            // console.log("LOADING TARGET");
            //annotation element gets data that may be needed later
            self.element = element;
            console.log("Target loaded");
            // finish setting up selectors
            // self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);

            // finish setting up extra plugins
            self.setUpPlugins(self.element[0]);

            // finish setting up the storage containers
            self.setUpStorage(self.element[0]);

            // if (!self.options.viewerOptions.readonly) {
            //     self.setUpSelectors(self.element[0]);
            // }
        });

        $.subscribeEvent('editorShown', self.instance_id, function(_, editor, annotation) {
            jQuery.each(self.plugins, function(_, plugin) {
                if (typeof(plugin.editorShown) === "function") {
                    plugin.editorShown(editor, annotation);
                }
            });
        });

        $.subscribeEvent('displayShown', self.instance_id, function(_, display, annotations) {
            jQuery.each(self.plugins, function(_, plugin) {
                if (typeof(plugin.displayShown) === "function") {
                    plugin.displayShown(display, annotations);
                }
            });
        });

    };

    $.ImageTarget.prototype.setUpViewers = function(element) {
        var self = this;
        self.viewers = [];
        jQuery.each($.viewers, function(_, viewer) {
            self.viewers.push(new viewer({
                element: element,
                template_urls: self.options.template_urls,
                viewer_options: self.options.viewerOptions,
                username: self.options.username,
                user_id: self.options.user_id,
                common_instructor_name: self.options.common_instructor_name,
                instructors: self.options.instructors,
                mediaType: self.media,
            }, self.instance_id));
        });
    };

    $.ImageTarget.prototype.setUpPlugins = function(element) {
        var self = this;
        self.plugins = [];
        jQuery.each($.plugins, function(_, plugin) {
            var optionsForPlugin;
            try {
                optionsForPlugin = jQuery.extend({'slot': element}, self.options, self.options[plugin.name]) || {'slot': element};
            } catch (e) {
                optionsForPlugin = {'slot': element};
            }

            self.plugins.push(new plugin( optionsForPlugin, self.instance_id));
        });
    };

    $.ImageTarget.prototype.StorageAnnotationSave = function(ann, callBack, errorCallback) {
        var self = this;
        jQuery.each(self.storage, function(_, store) {
            console.log("Saving to store", store, ann);
            store.StorageAnnotationSave(ann, self.element, false, callBack, errorCallback);
        });
    };

    $.ImageTarget.prototype.StorageAnnotationDelete = function(ann, callBack, errorCallback) {
        var self = this;
        console.log("DELETING", arguments);
        // self.mir.eventEmitter.publish('annotationDeleted.' + self.windowId, ann.id.toString());
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationDelete(ann);
        });
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationDelete(ann, callBack, errorCallback);
        });
    };

    $.ImageTarget.prototype.ViewerEditorClose = function(ann, is_new_annotation, hit_cancel) {
        var self = this;
        console.log("EDITING", arguments);

        if (!hit_cancel && !is_new_annotation) {
            var annotation = ann;
            console.log("Should update", ann, self.mir);
            
            var annotationInOA = self.mir.viewer.workspace.slots[0].window.annotationsList.filter(function(mirAnn) {
                if (ann.id.toString() === mirAnn["@id"].toString()) {
                    return mirAnn;
                }
            })[0];

            // from mirador endpoint code
            //remove all tag-related content in annotation
            annotationInOA.motivation = jQuery.grep(annotationInOA.motivation, function(value) {
                return value !== "oa:tagging";
            });
            annotationInOA.resource = jQuery.grep(annotationInOA.resource, function(value) {
                return value["@type"] !== "oa:Tag";
            });
            //re-add tagging if we have them
            if (ann.tags && ann.tags.length > 0) {
                annotationInOA.motivation.push("oa:tagging");
                jQuery.each(ann.tags, function(index, value) {
                    annotationInOA.resource.push({
                        "@type": "oa:Tag",
                        "chars": value
                    });
                });
            }
            jQuery.each(annotationInOA.resource, function(index, value) {
                if (value["@type"] === "dctypes:Text") {
                    value.chars = ann.annotationText.join('<p></p>');
                }
            });

            self.mir.eventEmitter.publish('annotationUpdated.' + self.windowId, annotationInOA);

            jQuery.each(self.viewers, function(_, viewer) {
                viewer.addAnnotation(ann, true, false);
            })
        }
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationGetReplies (name)
     */
    $.ImageTarget.prototype.StorageAnnotationSearch = function(search_options, callback, errfun) {
        var self = this;
        jQuery.each(self.storage, function(_, store) {
            store.search(search_options, callback, errfun);
        });
    };

    $.ImageTarget.prototype.setUpStorage = function(element, options) {
        var self = this;
        self.storage = [];
        jQuery.each($.storage, function(idx, storage) {
            var optionsForStorage;
            try {
                optionsForStorage = jQuery.extend({}, self.options, self.options[storage.name]) || {};
            } catch (e) {
                optionsForStorage = {};
            }
            self.storage.push(new storage(optionsForStorage, self.instance_id));
            if (self.options.viewerOptions.defaultTab === "mine") {
                options = {
                    'username': self.options.username
                }
            } else if (self.options.viewerOptions.defaultTab === "instructor") {
                options = {
                    'userid': self.options.instructors
                }
            } else {
                var exclusion = [self.options.user_id].concat(self.options.instructors)
                options = {
                    'exclude_userid': exclusion
                }
            }

            self.storage[idx].onLoad(element, options);
        });
    };

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
