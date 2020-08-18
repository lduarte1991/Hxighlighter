require('./plugins/hx-sidebar-tag-tokens.js');
require('./plugins/hx-adminbutton.js');
require('./viewers/sidebar.js');
require('./plugins/hx-permissions.js');
require('./plugins/hx-alert.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/hx-reply.js');
require('./plugins/hx-websockets.js');
require('./plugins/vjs-rangeslider-component.js');
require('./storage/catchpy.js');

import * as videojs from 'video.js/dist/video.js'

(function($) {
    /**
     * { function_description }
     *
     * @class      TextTarget (name)
     * @param      {<type>}  options  The options
     * @param      {<type>}  inst_id  The instance identifier
     */
    $.VideoTarget = function(options, inst_id) {
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
    $.VideoTarget.prototype.init = function () {
        var self = this;
        // this target is only meant to work with text/html objects
        this.media = "video";
        this.setUpListeners();
        this.setUpPlayer();

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

    $.VideoTarget.prototype.setUpPlayer = function() {
        var self = this;
        this.guid = $.getUniqueId();
        var selector = jQuery('#viewer');
        var origWidth = selector[0].clientWidth;
        selector.append('<video id="vid1" class="video-js"><source src="'+this.options.vid_url+'" type="video/mp4"></source></video>')
        console.log(origWidth);

        this.vid_player = videojs('vid1', {
            "width": origWidth + 'px',
            "controls": true,
            "fill": true,
            "controlBar": {
                pictureInPictureToggle: false
            }
        }, function onPlayerReady() {
            // future-use : establishing PIP
            $.publishEvent('targetLoaded', self.instance_id, [jQuery('#viewer')]);
            jQuery.each($.globals.vjs.components, function(_, callback) {
                callback(self.vid_player);
            });
        });
        /*
         *TODO: Plugins/Features
         * 1. ***Video Quality Control https://www.npmjs.com/package/videojs-contrib-quality-levels
         * 2. HLS
         * 2. Wavesurfer for Audio: https://www.npmjs.com/package/videojs-wavesurfer
         * 3. Playback: Youtube, Vimeo https://www.npmjs.com/package/videojs-youtube https://www.npmjs.com/package/@devmobiliza/videojs-vimeo
         * 4. **Download Button https://www.npmjs.com/package/videojs-vjsdownload
         * 5. **Hotkeys https://www.npmjs.com/package/videojs-hotkeys
         * 6. Mobile UI https://www.npmjs.com/package/videojs-mobile-ui
         * 7. **https://www.npmjs.com/package/videojs-overlay-hyperlink
         * 8. https://www.npmjs.com/package/videojs-audio-tracks
         * 9. ANNOTATIONS
         */

    };

    /**
     * { function_description }
     */
    $.VideoTarget.prototype.setUpListeners = function() {
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

        $.subscribeEvent('GetSpecificAnnotationData', self.windowId, function(_, id, callBack) {
            // console.log(self.mir.viewer.workspace.slots[0].window.endpoint);
            // callBack(self.mir.viewer.workspace.slots[0].window.endpoint.annotationsListCatch.find(function(ann) {
            //     return ann['id'] === id;
            // }));
            return undefined;
        });
    };

    $.VideoTarget.prototype.setUpViewers = function(element) {
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

    $.VideoTarget.prototype.setUpPlugins = function(element) {
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

    $.VideoTarget.prototype.setUpStorage = function(element, options) {
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
        });
    };

    $.VideoTarget.prototype.StorageAnnotationSave = function(ann, callBack, errorCallback) {

    };

    $.VideoTarget.prototype.StorageAnnotationUpdate = function(ann, callBack, errorCallback) {

    };

    $.VideoTarget.prototype.StorageAnnotationDelete = function(ann, callBack, errorCallback) {
    };

    $.VideoTarget.prototype.ViewerEditorClose = function(ann, is_new_annotation, hit_cancel) {

    };

    $.VideoTarget.prototype.StorageAnnotationSearch = function(search_options, callback, errfun, shouldNotErase) {

    };

    $.VideoTarget.prototype.StorageAnnotationLoad = function(annotations, converter, undrawOld) {

    };

    $.VideoTarget.prototype.populateStorage = function(element) {
        var self = this;
        var options = {};
        if (self.options.viewerOptions.defaultTab === "mine") {
            options = {
                'userid': self.options.user_id
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
        jQuery.each(self.storage, function(idx, store){
            store.onLoad(element, options, function(anns, converter) {
                $.publishEvent('drawFromSearch', self.instance_id, [anns, converter]);
            });
        });
    }

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
