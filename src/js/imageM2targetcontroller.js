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
require('./plugins/m2-viewer-plugin.js');
require('./plugins/m2-hxighlighter-endpoint.js');
require('./plugins/hx-reply.js');
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
        // console.log("should be loading image");
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
            // console.log("Loading manifest...", this.options.manifest_url)
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
            buildPath: self.options.mirador_build_path,
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
                    dialogInBody: false,
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
                    instructors: self.options.instructors,
                    common_name: self.options.common_instructor_name
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
            self.mir.eventEmitter.subscribe('annotationsRendered.' + self.windowId, function(e) {
                var overlay = window.paper.projects[0].getItem();
                if (!overlay) {
                    return;
                }
                var drawnPaths = overlay._children;
                var m2area = self.mir.viewer.workspace.slots[0].window;
                var annotationsList = m2area.annotationsList.map(function(x) {
                    return m2area.endpoint.getAnnotationInEndpoint(x);
                });
                jQuery.each(drawnPaths, function(_, path) {
                    jQuery.each(annotationsList, function(_, ann) {
                        if (ann.svg.indexOf(path._name) > -1) {
                            var tag = ann.tags.pop();
                            ann.tags.push(tag);
                            $.publishEvent('changeColorOfElement', self.instance_id, [tag, function(color) {
                                if (color) {
                                    path.strokeColor = color;
                                }
                            }])
                        }
                    });
                });
            });
            self.mir.eventEmitter.subscribe('catchAnnotationsLoaded.' + self.windowId , function (event) {
                var miradorAnnotations = Array.from(arguments);
                miradorAnnotations.shift();
                jQuery.each(self.viewers, function(_, viewer) {
                    if (typeof(viewer.StorageAnnotationLoad) === "function") {
                        jQuery.each(miradorAnnotations, function(idx, hxAnnotation) {
                            $.publishEvent("annotationLoaded", self.instance_id, [hxAnnotation]);
                        });
                    }
                });
            });
            // self.mir.eventEmitter.subscribe('annotationEditSave.' + self.windowId, function(event, miradorAnnotation) {
            //     console.log("what");
            //     var endpointAnnotation = miradorAnnotation.endpoint.getAnnotationInEndpoint(miradorAnnotation)[0];
            //     endpointAnnotation = endpointAnnotation || miradorAnnotation; 
            //     console.log('~', endpointAnnotation, miradorAnnotation);
            //     var annotation = self.convertFromOA(endpointAnnotation);
            //     jQuery.each(self.viewers, function(_, viewer) {
            //         viewer.addAnnotation(annotation, true, false);
            //     });
            // });

            // self.mir.eventEmitter.subscribe('catchAnnotationDeleted.' + self.windowId, function(event, annotationId) {
            //         $.publishEvent('StorageAnnotationDelete', self.instance_id, [{id: annotationId}, false]);
            // });

            self.mir.eventEmitter.subscribe('catchAnnotationCreated.' + self.windowId, function(event, catchAnnotation) {
                // console.log("annotation Created", catchAnnotation);
                
                jQuery.each(self.viewers, function(_, viewer) {
                    viewer.addAnnotation(catchAnnotation, false, false);
                });
            });
            self.mir.eventEmitter.subscribe('catchAnnotationUpdated.' + self.windowId, function(event, catchAnnotation) {
                // console.log("annotation Updated", catchAnnotation);
                
                jQuery.each(self.viewers, function(_, viewer) {
                    viewer.addAnnotation(catchAnnotation, true, false);
                });
            });

            self.mir.eventEmitter.subscribe('catchAnnotationDeleted.' + self.windowId, function(event, response) {
                // console.log("annotation Deleted", response);

                jQuery.each(self.viewers, function(_, viewer) {
                    viewer.StorageAnnotationDelete(response['annotation']);
                });
                jQuery.each(self.storage, function(_, store) {
                    store.StorageAnnotationDelete(response['annotation'], response['success'], response['error']);
                });
            });

            self.mir.eventEmitter.subscribe('imageRectangleUpdated', function(event, options){
                self.imageLimits = {}
                jQuery.each(self.mir.saveController.slots[0].window.imagesList, function(index, value) {
                    if (value["@id"] == self.mir.saveController.slots[0].window.canvasID) {
                        self.imageLimits = {
                            'height': value.height,
                            'width': value.width
                        }
                    }
                });
                var xChecked = options.osdBounds.x;
                var yChecked = options.osdBounds.y;
                var heightChecked = options.osdBounds.height;
                var widthChecked = options.osdBounds.width;
                if (xChecked < 0) {
                    xChecked = 0;
                }
                if(heightChecked > self.imageLimits.height){
                    heightChecked = self.imageLimits.height;
                }
                if (yChecked < 0) {
                    yChecked = 0;
                }
                if(widthChecked > self.imageLimits.width){
                    widthChecked = self.imageLimits.width;
                }

                self.currentImageBounds = {
                    "height": heightChecked.toString(),
                    "width": widthChecked.toString(),
                    "x": xChecked.toString(),
                    "y": yChecked.toString(),
                };
            });

            self.setUpKeyboardInput();

            // self.mir.eventEmitter.subscribe('annotationsRendered.' + self.windowId, function(e) {
            //     var annotations = self.mir.viewer.workspace.slots[0].window.annotationsList;
            //     if (annotations !== undefined && annotations !== null && annotations.length > 0) {
            //         window.paper.
            //     };
            // });

        });
    };

    $.ImageTarget.prototype.setUpKeyboardInput = function() {
        var self = this;
        var snapshot = function() {

            var segs = [];
            var x = parseInt(self.currentImageBounds.x, 10);
            var y = parseInt(self.currentImageBounds.y, 10);
            var w = parseInt(self.currentImageBounds.width, 10);
            var h = parseInt(self.currentImageBounds.height, 10);

            segs.push(new window.paper.Point(x,y));
            segs.push(new window.paper.Point(x + 0.5*w, y));
            segs.push(new window.paper.Point(x + 0.5*w, y));
            segs.push(new window.paper.Point(x + w, y));
            segs.push(new window.paper.Point(x + w, y + 0.5 * h));
            segs.push(new window.paper.Point(x + w, y + h));
            segs.push(new window.paper.Point(x + 0.5*w, y + h));
            segs.push(new window.paper.Point(x, y + h));
            segs.push(new window.paper.Point(x, y + 0.5*h));

            var shape = new window.paper.Path({
                segments: segs,
                fullySelected: true,
                name: 'rectangle_' + Hxighlighter.getUniqueId()
            });
            shape.data.strokeWidth = 3;
            shape.strokeWidth = 3;
            shape.strokeColor = '#00bfff';
            shape.closed = true;
            shape.data.rotation = 0;

            var overlay = self.mir.viewer.workspace.slots[0].window.focusModules.ImageView.annotationsLayer.drawTool.svgOverlay;
            overlay.mode = 'create';
            overlay.inEditOrCreateMode = true;
            overlay.currentTool = overlay.tools[0];
            overlay.eventEmitter.publish('modeChange.' + self.windowId, 'creatingAnnotation');
            overlay.eventEmitter.publish('toggleDrawingTool.' + self.windowId, "check_box_outline_blank");
            overlay.path = shape;
            overlay.onDrawFinish();
        }
        jQuery(document).on('keydown', function(event){
            if ((event.key == '1' && (event.altKey || event.ctrlKey)) || (event.key == '\'' && (event.altKey || event.ctrlKey))) {
                event.preventDefault();
                snapshot();
                return false;
            } else if (event.key == 'Escape') {
            }

            if ((event.key == '2' && (event.altKey || event.ctrlKey))) {
                event.preventDefault();
                var currentInst = jQuery('.sr-alert').html();
                if (currentInst.trim() === "") {
                    currentInst = 'Hit "Ctrl + 1" to annotate part of the image currently shown in the window.';
                }
                jQuery('.sr-alert').html('');
                setTimeout(function() {
                    jQuery('.sr-alert').html(currentInst);
                }, 250);
            }
            if ((event.key == '3' && (event.altKey || event.ctrlKey))) {
                var currVal = jQuery('#hx-sr-notifications').attr('aria-live');
                var newVal = (currVal == "off") ? 'assertive' : 'off';
                var newAlert = currVal == "off" ? 'Help text is on' : 'Help text is off';
                if (newVal == "off") {
                    jQuery('.sr-real-alert').html(newAlert);
                    setTimeout(function() {
                        jQuery('#hx-sr-notifications').attr('aria-live', newVal);
                        jQuery('.sr-real-alert').html('');
                    }, 500);
                    var currVal = jQuery('.sr-alert').html();
                    jQuery('.sr-alert').html('');
                    jQuery('.sr-alert').data('old', currVal);
                } else {
                    jQuery('.sr-alert').html(jQuery('.sr-alert').data('old'));
                    jQuery('#hx-sr-notifications').attr('aria-live', newVal);
                    jQuery('.sr-real-alert').html(newAlert);

                }
                
                event.preventDefault();
            }
        });
        jQuery(document).on('keyup', '*[role="button"]', function(evt) {
            if (evt.key == 'Enter' || evt.key == ' ') {
                jQuery(evt.currentTarget).click();
                return $.pauseEvent(evt);;
            }
        });
        jQuery(document).on('click', 'button[class*="make-annotation-button"]', function(evt) {
            snapshot();
        });

        jQuery(document).on('click', 'a[class*="keyboard-toggle"]', function(evt) {
            jQuery('#key-help').toggleClass('sr-only');
            jQuery('#key-help').toggleClass('image-scrollable-helper');
            jQuery('#viewer').toggleClass('image-viewer-keyboard-help');
            jQuery(this).toggleClass('selected');
            $.publishEvent('resizeWindow', self.instance_id, []);
        });

        $.subscribeEvent('wysiwygOpened', self.instance_id, function(e) {
            setTimeout(function() {
                jQuery('.note-editable.card-block')[0].focus();
            }, 500);
        });
    }

    $.ImageTarget.prototype.convertFromOA = function(miradorAnnotation) {
        var self = this;
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
        });

        jQuery('body').on('click', '.annotation-display', function(event) {
            var annotation_id = event.currentTarget.getAttribute('data-anno-id');
            jQuery('.side.item-' + annotation_id)[0].scrollIntoView();
        });

        jQuery('body').on('click', '.focus-on-location', function(event) {
            var location = event.currentTarget.getAttribute('data-link-to');
            jQuery(location).attr('tabindex', '0');
            jQuery(location)[0].focus();
            console.log(location, jQuery(location));
        });
        
        // once the target has been loaded, the selector can be instantiated
        $.subscribeEvent('targetLoaded', self.instance_id, function(_, element) {
            // console.log("LOADING TARGET");
            //annotation element gets data that may be needed later
            self.element = element;
            // console.log("Target loaded");
            // finish setting up selectors
            // self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);

            // finish setting up extra plugins
            self.setUpPlugins(self.element[0]);

            // finish setting up the storage containers
            self.setUpStorage(self.element[0]);

            // if (!self.options.viewerOptions.readonly) {
            //     self.setUpSelectorsƒ(self.element[0]);
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

        $.subscribeEvent('zoomTo', self.instance_id, function(_, bounds, ann) {
            self.mir.eventEmitter.publish('fitBounds.' + self.windowId, bounds);
            var overlay = window.paper.projects[0].getItem();
            if (!overlay) {
                return;
            }
            var drawnPaths = overlay._children;
            jQuery.each(drawnPaths, function(_, path) {
                if (ann.svg.indexOf(path._name) > -1) {
                    jQuery(path).animate({
                        strokeWidth: "10px"
                    }, 600).animate({
                        strokeWidth: "2px"
                    }, 600)
                }
            });
        });

        $.subscribeEvent('GetSpecificAnnotationData', self.windowId, function(_, id, callBack) {
            // console.log(self.mir.viewer.workspace.slots[0].window.endpoint);
            callBack(self.mir.viewer.workspace.slots[0].window.endpoint.annotationsListCatch.find(function(ann) {
                return ann['id'] === id;
            }));
        });

        $.subscribeEvent('resizeWindow', self.instance_id, function() {
            self.mir.eventEmitter.publish('resizeMirador');
        });


        // $.subscribeEvent('changeDrawnColor', self.inst_id, function(_, ann, color) {
        //     console.log(ann, color);
        //     var path_id_regex = /id="(.*?)"/g;
        //     let results = [...ann.svg.matchAll(path_id_regex)];
        //     jQuery.each(results, function(_, path_id) {
        //         jQuery.each(window.paper.projects[0].getItem()._children, function(__, drawnShape) {
        //             if (drawnShape._name === path_id) {
        //                 console.log(drawnShape);
        //             }
        //         })
        //     });
        // })

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
            // console.log("3. Sending it to store to save", store, ann);
            store.StorageAnnotationSave(ann, self.element, false, function(x){
                setTimeout(function() {jQuery('#hx-sr-notifications .sr-alert').html('Annotation was created and added to top of Annotation List')}, 500);
                callBack(x)
            }, errorCallback);
        });
    };

    $.ImageTarget.prototype.StorageAnnotationUpdate = function(ann, callBack, errorCallback) {
        var self = this;
        //console.log("Reached here");
        jQuery.each(self.storage, function(_, store) {
            // console.log("3. Sending it to store to save", store, ann);
            store.StorageAnnotationUpdate(ann, self.element, callBack, errorCallback);
        });
    };

    $.ImageTarget.prototype.StorageAnnotationDelete = function(ann, callBack, errorCallback) {
        var self = this;
        // console.log("DELETING", arguments, ann.id);
        self.mir.eventEmitter.publish('annotationDeleted.' + self.windowId, ann.id.toString());  
    };

    $.ImageTarget.prototype.ViewerEditorClose = function(ann, is_new_annotation, hit_cancel) {
        var self = this;
        // console.log("EDITING", arguments);

        if (!hit_cancel && !is_new_annotation) {
            var annotation = ann;
            // console.log("Should update", ann, self.mir);
            ann = self.plugins.reduce(function(ann, plugin) { return plugin.saving(ann); }, annotation);
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
        if (self.windowId && search_options.media !== "Annotation") {
            self.mir.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {
                windowId: self.windowId,
                annotationsList: []
            });
        }
        
        jQuery.each(self.storage, function(_, store) {
            store.search(search_options, callback, errfun);
        });
    };

    $.ImageTarget.prototype.StorageAnnotationLoad = function(annotations, converter, undrawOld) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            if (typeof(viewer.StorageAnnotationLoad) === "function") {
                viewer.StorageAnnotationLoad(annotations);
            }
        });

        annotations.forEach(function(ann) {
            var converted_ann = converter(ann, jQuery(self.element).find('.annotator-wrapper'));
            $.publishEvent('annotationLoaded', self.instance_id, [converted_ann]);
        });
        self.mir.viewer.workspace.slots[0].window.endpoint.drawFromSearch(annotations, converter);
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
