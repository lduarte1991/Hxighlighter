require('./selectors/time-selector.js');
require('./drawers/timerange-drawer.js');
require('./plugins/hx-sidebar-tag-tokens.js');
require('./plugins/hx-adminbutton.js');
require('./viewers/sidebar.js');
require('./viewers/floatingviewer.js');
require('./plugins/hx-permissions.js');
require('./plugins/hx-alert.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/hx-reply.js');
require('./plugins/hx-websockets.js');
require('./plugins/hx-export-print.js');
require('./plugins/hx-prevnextbutton.js');
require('./plugins/vjs-live-transcript.js');
require('./plugins/vjs-annotation-display-component.js');
require('./plugins/vjs-rangeslider-component.js');

require('./storage/catchpy.js');

require('video.js');
require('videojs-transcript');
require('videojs-youtube');

(function($) {
    var videojs = require('video.js');

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
        var html = '<div class="annotator-wrapper"><video id="vid1" class="video-js" type="*"><source src="'+this.options.object_id+'" type="'+this.options.source_type+'"></source></video></div>'
        if (this.options.transcript_url && this.options.transcript_url.length > 0) {
            html = '<div class="annotator-wrapper"><video id="vid1" class="video-js" type="*"><source src="'+this.options.object_id+'" type="'+this.options.source_type+'"></source><track kind="captions" src="' + this.options.transcript_url +'" srclang="en" label="English" default></video><div id="transcript1"></div></div>'
        }
        selector.append(html)
        
        this.vid_player = videojs('vid1', {
            "width": origWidth + 'px',
            "controls": true,
            "fill": true,
            "controlBar": {
                pictureInPictureToggle: false,
                fullscreenToggle: false,
                volumePanel: {
                    inline: false,
                }
            },
            playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
            "instance_id": self.instance_id
        }, function onPlayerReady() {
            $.publishEvent('targetLoaded', self.instance_id, [jQuery('#viewer')]);
            jQuery.each($.globals.vjs.components, function(_, callback) {
                callback(self.vid_player);
            });
            jQuery('.annotationsHolder').addClass('video-version');
            self.vid_player.on('playerresize', function() {
                jQuery.each(self.drawers, function(_, drawer) {
                    drawer.refreshDisplay(self.vid_player);
                });
            });
            $.subscribeEvent('playAnnotation', self.instance_id, function(_, annotation) {
                // console.log('playAnnotation event triggered');
                self.vid_player.trigger('playAnnotation', annotation);
            });
            if (self.options.transcript_url && self.options.transcript_url.length > 0) {
                setTimeout(function() {
                        var options = {
                        showTitle: false,
                        showTrackSelector: false,
                        autoscroll: true,
                    }
                    var transcript = self.vid_player.transcript(options);
                    var transcriptContainer = document.querySelector('#transcript1');
                    transcriptContainer.appendChild(transcript.el());
                    //future-use : establishing PIP
                }, 500)
            } else {
                jQuery('.vjs-toggle-transcript').hide();
            }
            
            // self.vid_player.transcript(options);
            // var transcriptContainer = document.querySelector('#transcript');
            // transcriptContainer.appendChild(transcript.el());

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
            
            // self.setUpSelectors(self.element[0]);
            // self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);

            // finish setting up extra plugins
            self.setUpPlugins(self.element[0]);

            // finish setting up the storage containers
            self.setUpStorage(self.element[0]);

            // console.log('about to add selectors')
            if (!self.options.viewerOptions.readonly) {
                // console.log("Adding selectors", self.setUpSelectors);
                self.setUpSelectors(self.element[0]);
            }
            self.setUpDrawers(self.element[0]);

            self.setUpKeyboard();
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

        $.subscribeEvent('TargetAnnotationDraw', self.instance_id, function(_, annotation, toEnd) {
            if (typeof toEnd === "undefined") {
                toEnd = false;
            }
            self.TargetAnnotationDraw(annotation, toEnd);
        });

        $.subscribeEvent('TargetAnnotationUndraw', self.instance_id, function(_, annotation) {
            self.TargetAnnotationUndraw(annotation);
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

    $.VideoTarget.prototype.setUpSelectors = function(element) {
        var self = this;
        self.selectors = [];
        jQuery.each($.selectors, function(_, selector) {
            self.selectors.push(new selector(element, self.instance_id, {'confirm': true}));
        });
    };

    $.VideoTarget.prototype.setUpDrawers = function(element) {
        var self = this;
        self.drawers = [];
        jQuery.each($.drawers, function(_, drawer) {
            self.drawers.push(new drawer(element, self.instance_id, self.annotation_selector, self.options));
        });
    }

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

    $.VideoTarget.prototype.setUpKeyboard = function() {
        var self = this;
        var snapshot = function() {
            self.vid_player.play();
            setTimeout(self.vid_player.pause, 100);
            jQuery('.vjs-annotate-button.vjs-button').click();
            setTimeout(function() {
                jQuery('#vjs-start-range-text-input').focus();
            }, 500);
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
            jQuery('#key-help').toggleClass('video-scrollable-helper');
            jQuery('#viewer').toggleClass('video-viewer-keyboard-help');
            jQuery(this).toggleClass('selected');
            self.vid_player.trigger('playerresize');
        });
    };

    $.VideoTarget.prototype.StorageAnnotationSave = function(annotations, redraw) {
        var self = this;
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationSave(annotations, self.element, redraw);
        });
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationSave(annotations);
        });
    };

    $.VideoTarget.prototype.StorageAnnotationUpdate = function(ann, callBack, errorCallback) {

    };

    $.VideoTarget.prototype.StorageAnnotationDelete = function(ann, callBack, errorCallback) {
        var self = this;
        // console.log("TRYING TO DELETE");
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationDelete(ann);
        });
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationDelete(ann);
        });
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.undraw(ann);
        });
    };

    $.VideoTarget.prototype.ViewerEditorClose = function(annotation, is_new_annotation, hit_cancel) {
        var self = this;
        //console.log(annotation, 'New?:', is_new_annotation, 'Hit Cancel', hit_cancel);
        if (hit_cancel) {
            if (is_new_annotation) {
                self.TargetAnnotationUndraw(annotation);
            }
            
            // else, the annotation was already drawn, so don't touch it.
        } else if (is_new_annotation) {
            annotation = self.plugins.reduce(function(ann, plugin) { return plugin.saving(ann); }, annotation);
            self.TargetAnnotationDraw(annotation);
            jQuery('.sr-alert').html('');
            jQuery('.sr-real-alert').html('Your annotation was saved. Your annotation has been added to the top of the annotation list.');
            $.publishEvent('StorageAnnotationSave', self.instance_id, [annotation, false]);
            // console.log('should save new annotation', annotation)
        } else {
            jQuery.each(self.drawers, function(_, drawer) {
                self.TargetAnnotationUndraw(annotation);
                annotation = self.plugins.reduce(function(ann, plugin) { return plugin.saving(ann); }, annotation);
                $.publishEvent('TargetAnnotationDraw', self.instance_id, [annotation]);
                jQuery('.sr-alert').html('');
                jQuery('.sr-real-alert').html('Your annotation was updated. You can find your annotation in the annotation list.');
                $.publishEvent('StorageAnnotationSave', self.instance_id, [annotation, true]);
                // console.log('updating ann')
            });
        }

        jQuery.each(self.viewers, function(_, viewer) {
            var timer = new Date();
            viewer.ViewerEditorClose(annotation);
            // console.log("Finished: " + (new Date() - timer) + 'ms')
        });

        setTimeout(function() {$.publishEvent('editorHidden', self.instance_id, []);}, 50);
        return annotation;
    };

    $.VideoTarget.prototype.TargetAnnotationUndraw = function(annotation) {
        var self = this;
        if (annotation.media !== "Annotation") {
            jQuery.each(self.drawers, function(_, drawer) {
                drawer.undraw(annotation);
            });
        }
    };

    $.VideoTarget.prototype.TargetAnnotationDraw = function(annotation, toEnd) {
        // console.log("IN VIDEOTARGET DRAW", annotation);
        var self = this;
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.draw(annotation, self.vid_player, toEnd);
        });
        // this.vid_player.trigger('drawAnnotation', {
        //     'annotation': annotation
        // });

    };

    $.VideoTarget.prototype.StorageAnnotationSearch = function(search_options, callback, errfun, shouldNotErase) {
        var self = this;
        jQuery.each(self.storage, function(_, store) {
            store.search(search_options, callback, errfun);
        });
    };

    $.VideoTarget.prototype.StorageAnnotationLoad = function(annotations, converter, undrawOld) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            if (typeof(viewer.StorageAnnotationLoad) === "function") {
                viewer.StorageAnnotationLoad(annotations);
            }
        });
        // console.log("UNDRAWING", undrawOld);

        if (undrawOld) {
            $.publishEvent('GetAnnotationsData', self.instance_id, [function(anns) {
                // console.log("UNDRAWING", anns);
                anns.forEach(function(ann) {
                    self.TargetAnnotationUndraw(ann);
                });
            }]);
        }

        annotations.forEach(function(ann) {
            var converted_ann = converter(ann, jQuery(self.element).find('.annotator-wrapper'));
            self.TargetAnnotationDraw(converted_ann, true);
            $.publishEvent('annotationLoaded', self.instance_id, [converted_ann])
            
        });
    };

    $.VideoTarget.prototype.TargetSelectionMade = function(range, event) {
        var range = Array.isArray(range) ? range : [range];
        var self = this;
        var annotation = {
            annotationText: [""],
            ranges: range,
            id: $.getUniqueId(),
            media: "video",
            totalReplies: 0,
            creator: {
                name: self.options.username,
                id: self.options.user_id
            }
        };
        // console.log(annotation);
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.TargetSelectionMade(annotation, event);
        });
    };

    $.VideoTarget.prototype.ViewerDisplayOpen = function(event, annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayOpen(event, annotations);
        });
        return annotations;
    };

    $.VideoTarget.prototype.ViewerDisplayClose = function(event) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayClose(event);
            // console.log("CLOSING VIDEO TARGET VIEWER DISPLAY CLOSE")
        });
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
                // console.log('hello hhello hello', anns);
                $.publishEvent('drawFromSearch', self.instance_id, [anns, converter]);
            });
        });
    }

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
