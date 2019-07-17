/**
 * 
 */

//during deployment, this is what decides what gets instantiated, should be moved elsewhere
require('./selectors/keyboard-selector.js');
require('./selectors/mouse-selector.js');
require('./drawers/xpath-drawer.js');
require('./viewers/sidebar.js');
require('./viewers/floatingviewer.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/hx-reply.js');
require('./plugins/hx-instruction-panel.js');
require('./plugins/hx-font-resize.js');
require('./plugins/hx-toggle-annotations.js');
require('./plugins/hx-display-resize.js');
require('./plugins/hx-sidebar-tag-tokens.js');
require('./plugins/hx-permissions.js');
require('./plugins/hx-alert.js');
require('./plugins/hx-badges.js')
require('./storage/catchpy.js');

(function($) {

    /**
     * { function_description }
     *
     * @class      TextTarget (name)
     * @param      {<type>}  options  The options
     * @param      {<type>}  inst_id  The instance identifier
     */
    $.TextTarget = function(options, inst_id) {
        this.options = options;
        this.instance_id = inst_id;
        this.guid = undefined;
        this.annotation_selector = 'hx-annotation-hl';
        this.init();
    };

    /**
     * { function_description }
     */
    $.TextTarget.prototype.init = function () {
        var self = this;
        // this target is only meant to work with text/html objects
        this.media = "text";

        // this where the target will be contained
        this.target_selector = this.options.target_selector;

        // sets up listeners from core and other places
        this.setUpListeners();

        if (this.options.method == "url") {
            // if the text exists externally, this will load it into the DOM
            this.makeQuery(this.options.object_source, this.createTextSlotFromURL.bind(this), this.target_selector)
        } else if (this.options.method == "inline") {
            // if the text is already in the DOM, this sets up what is left
            // console.log('Loading Target via Inline');
            this.createTextSlotFromSelector(this.options.object_source, this.instance_id);
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

    /**
     * Creates a text slot from url.
     *
     * @param      {string}  content      The content
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromURL = function(content, selector, instance_id) {
        this.guid = $.getUniqueId();

        // each annotation target will be enclosed in a "slot"
        var slot = "<div class='annotation-slot' id='" + this.guid + "'>" + content + "</div>";
        
        // adds it to the page and turns on the wrapper
        jQuery(selector).append(slot);
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');        
        
        // lets Core know that the target has finished loading on screen
        $.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
    };

    /**
     * Creates a text slot from selector.
     *
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromSelector = function(selector, instance_id) {
        
        // each annotation target will be enclosed in a "slot" with a temporary unique id
        this.guid = $.getUniqueId();
        var slot = jQuery(selector);
        slot.addClass('annotation-slot');
        slot.attr('id', this.guid);
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');
        
        // lets core know that the target has finished loading on screen
        // console.log("Publishing TargetLoaded");
        $.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
    };

    /**
     * Makes a query.
     *
     * @param      {<type>}    url       The url
     * @param      {Function}  callback  The callback
     * @param      {<type>}    selector  The selector
     * @return     {<type>}    { description_of_the_return_value }
     */
    $.TextTarget.prototype.makeQuery = function(url, callback, selector) {
        var self= this;
        
        // retrieves the text to be loaded onto the page and passes it to callback function
        var defer = jQuery.ajax({
            url: url,
            type: 'GET',
            contentType: 'charset=utf-8',
            success: function(data) {
                callback(data, selector, self.instance_id);
            },
            async: true
        });
        return defer;
    };

    /**
     * { function_description }
     */
    $.TextTarget.prototype.setUpListeners = function() {
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
            self.element.data('source_type', self.options.object_source);
            self.element.data('source_type', 'text');

            // finish setting up selectors
            self.setUpSelectors(self.element[0]);
            self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);

            // finish setting up extra plugins
            self.setUpPlugins(self.element[0]);

            // finish setting up the storage containers
            self.setUpStorage(self.element[0]);
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


    /**
     * { function_description }
     *
     * @param      {<type>}  element  The element
     */
    $.TextTarget.prototype.setUpSelectors = function(element) {
        var self = this;
        self.selectors = [];
        jQuery.each($.selectors, function(_, selector) {
            self.selectors.push(new selector(element, self.instance_id, {'confirm': true}));
        });
    }

    /**
     * { function_description }
     *
     * @param      {<type>}  element  The element
     */
    $.TextTarget.prototype.setUpDrawers = function(element) {
        var self = this;
        self.drawers = [];
        jQuery.each($.drawers, function(_, drawer) {
            self.drawers.push(new drawer(element, self.instance_id, self.annotation_selector));
        });
    }

    $.TextTarget.prototype.setUpViewers = function(element) {
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

    $.TextTarget.prototype.setUpPlugins = function(element) {
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

    $.TextTarget.prototype.setUpStorage = function(element, options) {
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
                    'username': self.options.instructors
                }
            }

            self.storage[idx].onLoad(element, options);
        });
    };

    /**
     * { function_description }
     *
     * @class      ComponentEnable (name)
     */
    $.TextTarget.prototype.ComponentEnable = function() {
        // Targets cannot technically be enabled/disabled, but 
        // there might be cases in which the target needs to be hidden/shown
      
        jQuery('#' + this.guid).show();  

    };

    /**
     * { function_description }
     *
     * @class      ComponentDisable (name)
     */
    $.TextTarget.prototype.ComponentDisable = function() {
        jQuery('#') + this.guid.hide();
    };

    /**
     * { function_description }
     *
     * @class      TargetSelectionMade (name)
     */
    $.TextTarget.prototype.TargetSelectionMade = function(range, event) {
        var range = Array.isArray(range) ? range : [range];
        var self = this;
        var annotation = {
            annotationText: [""],
            ranges: range,
            id: $.getUniqueId(),
            exact: range.map(function(r) { return r.text.exact.replace(/[\n\r]/g, '<br>').replace(/    /g, '&nbsp;') }),
            media: "text",
            totalReplies: 0,
            creator: {
                name: self.options.username,
                id: self.options.user_id
            }
        };
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.TargetSelectionMade(annotation, event);
        });
        //self.TargetAnnotationDraw(annotation);

        // jQuery('.annotator-wrapper')[0].focus();

        //$.publishEvent('ViewerEditorOpen', self.instance_id, [annotation]);
    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationDraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationDraw = function(annotation) {
        var self = this;
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.draw(annotation);
        });
        jQuery.each(self.viewers, function(_, viewer) {
            if ($.exists(viewer.TargetAnnotationDraw)) {
                viewer.TargetAnnotationDraw(annotation);
            }
        });
        jQuery.each(self.plugins, function(_, plugin) {
            if ($.exists(plugin.TargetAnnotationDraw)) {
                plugin.TargetAnnotationDraw(annotation);
            }
        });
    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationUndraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationUndraw = function(annotation) {
        var self = this;
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.undraw(annotation);
        });
    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorOpen (name)
     */
    $.TextTarget.prototype.ViewerEditorOpen = function(event, annotation) {
        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorClose (name)
     */
    $.TextTarget.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {
        var self = this;
        
        if (should_erase) {
            self.TargetAnnotationUndraw(annotation);
        } else {
            annotation = self.plugins.reduce(function(ann, plugin) { return plugin.saving(ann); }, annotation);
            self.TargetAnnotationDraw(annotation);
            // jQuery.each(self.storage, function(_, store) {
            //     store.StorageAnnotationSave(annotation, self.element, redraw);
            // });
            jQuery('.sr-real-alert').html('Your annotation was saved.');
            $.publishEvent('StorageAnnotationSave', self.instance_id, [annotation, redraw]);
        }

        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerEditorClose(annotation);
        });
        if (redraw) {
            jQuery.each(self.drawers, function(_, drawer) {
                self.TargetAnnotationUndraw(annotation);
                $.publishEvent('TargetAnnotationDraw', self.instance_id, [annotation]);
                // jQuery.each(self.storage, function(_, store) {
                //     store.StorageAnnotationUpdate(annotation, self.element);
                // })
                // $.publishEvent('StorageAnnotationUpdate', self.instance_id, [annotation, redraw]);
                //drawer.redraw(annotation);
            });
        }

        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayOpen (name)
     */
    $.TextTarget.prototype.ViewerDisplayOpen = function(event, annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayOpen(event, annotations);
        });
        return annotations;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayClose (name)
     */
    $.TextTarget.prototype.ViewerDisplayClose = function(annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayClose(annotations);
        });
        return annotations;
    };
    
    /**
     * { function_description }
     *
     * @class      StorageAnnotationSave (name)
     */
    $.TextTarget.prototype.StorageAnnotationSave = function(annotations, redraw) {
        var self = this;
        // console.log(annotations, redraw);
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationSave(annotations, self.element, redraw);
        });
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationSave(annotations);
        });
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationLoad (name)
     */
    $.TextTarget.prototype.StorageAnnotationLoad = function(annotations, converter) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            if (typeof(viewer.StorageAnnotationLoad) === "function") {
                viewer.StorageAnnotationLoad(annotations);
            }
        });
        $.publishEvent('GetAnnotationsData', self.instance_id, [function(anns) {
            anns.forEach(function(ann) {
                self.TargetAnnotationUndraw(ann);
            });
        }]);

        annotations.forEach(function(ann) {
            var converted_ann = converter(ann, jQuery(self.element).find('.annotator-wrapper'));
            self.TargetAnnotationDraw(converted_ann);
            $.publishEvent('annotationLoaded', self.instance_id, [converted_ann])
            
        });
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationEdit (name)
     */
    $.TextTarget.prototype.StorageAnnotationEdit = function() {

    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationDelete (name)
     */
    $.TextTarget.prototype.StorageAnnotationDelete = function(annotation) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationDelete();
        });
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationDelete(annotation);
        });
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationGetReplies (name)
     */
    $.TextTarget.prototype.StorageAnnotationSearch = function(search_options, callback, errfun) {
        var self = this;
        jQuery.each(self.storage, function(_, store) {
            store.search(search_options, callback, errfun);
        });
    };
}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
