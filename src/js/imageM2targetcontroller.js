/*
 *
 *
 */

require('./plugins/hx-sidebar-tag-tokens.js');
require('./plugins/hx-adminbutton.js');
require('./viewers/sidebar.js');
require('./plugins/hx-permissions.js');
require('./plugins/hx-alert.js');
require('./viewers/sidebar.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/m2-editor-plugin.js');

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
                'name': 'Catchpy',
                'module': 'CatchEndpoint',
                'options': {
                    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb25zdW1lcktleSI6Imxhbm5pc3RlciIsInVzZXJJZCI6ImZha2UtYW5vbnltb3VzLWlkLXN0dWRlbnQiLCJpc3N1ZWRBdCI6IjIwMTktMTAtMTVUMDE6MjQ6MTYuMTgxNDA4KzAwOjAwIiwidHRsIjoyNTkyMDAsIm92ZXJyaWRlIjpbXX0.6o149mr75QtNrOv3vm1K9yXFppcztT6V26Z6_sXhDA8',
                    prefix: 'https://devo.catchpy.harvardx.harvard.edu/annos',
                    params: '',
                    userid: self.options.user_id,
                    username: self.options.username,
                    roles: [],
                    collection_id: self.options.collection_id,
                    context_id: self.options.context_id,
                }
            }
        });
        $.publishEvent('targetLoaded', self.instance_id, [jQuery('#viewer')]);

        self.mir.eventEmitter.subscribe('windowAdded', function(event, windowId, slotAddress) {
            self.windowId = windowId.id;
            self.mir.eventEmitter.subscribe('catchAnnotationsLoaded.' + self.windowId , function (event, miradorAnnotation) {
                console.log('AnnotationsLoaded: ', miradorAnnotation);
                console.log('Viewers (' + self.viewers.length + "):", self.viewers)
                jQuery.each(self.viewers, function(_, viewer) {
                    console.log(typeof(viewer.StorageAnnotationLoad) === "function");
                    if (typeof(viewer.StorageAnnotationLoad) === "function") {
                        var annotation = {
                            annotationText: miradorAnnotation.text,
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
                            svg: miradorAnnotation.rangePosition[0].selector.item.value
                        };
                        $.publishEvent("annotationLoaded", self.instance_id, [annotation]);
                    }
                });
            });
        });
        
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

            // // finish setting up the storage containers
            // self.setUpStorage(self.element[0]);

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
}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
