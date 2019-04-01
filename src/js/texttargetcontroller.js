/**
 * 
 */

require('./selectors/keyboard-selector.js');
require('./selectors/mouse-selector.js');
require('./drawers/xpath-drawer.js');
require('./viewers/floatingviewer.js');

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
            this.createTextSlotFromSelector(this.options.object_source, this.target_selector);
        }
    };

    /**
     * Creates a text slot from url.
     *
     * @param      {string}  content      The content
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromURL = function(content, selector, instance_id) {
        this.guid = Hxighlighter.getUniqueId();

        // each annotation target will be enclosed in a "slot"
        var slot = "<div class='annotation-slot' id='" + this.guid + "'>" + content + "</div>";
        
        // adds it to the page and turns on the wrapper
        jQuery(selector).append(slot);
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');        
        
        // lets Core know that the target has finished loading on screen
        Hxighlighter.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
    };

    /**
     * Creates a text slot from selector.
     *
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromSelector = function(selector, instance_id) {
        
        // each annotation target will be enclosed in a "slot" with a temporary unique id
        this.guid = Hxighlighter.getUniqueId();
        var slot = jQuery(selector).addClass('annotation-slot');
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');
        
        // lets core know that the target has finished loading on screen
        Hxighlighter.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
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
        
        // once the target has been loaded, the selector can be instantiated
        Hxighlighter.subscribeEvent('targetLoaded', self.instance_id, function(_, element) {
            //annotation element gets data that may be needed later
            self.element = element;
            self.element.data('source_type', self.options.object_source);
            self.element.data('source_type', 'text');

            // finish setting up selectors
            self.setUpSelectors(self.element[0]);
            self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);
        });

        jQuery(self.element).on('mouseover', '.' + self.annotation_selector, function() {

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
        jQuery.each(Hxighlighter.selectors, function(_, selector) {
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
        jQuery.each(Hxighlighter.drawers, function(_, drawer) {
            self.drawers.push(new drawer(element, self.instance_id, self.annotation_selector));
        });
    }

    $.TextTarget.prototype.setUpViewers = function(element) {
        var self = this;
        self.viewers = [];
        jQuery.each(Hxighlighter.viewers, function(_, viewer) {
            self.viewers.push(new viewer({
                element: element,
                template_urls: self.options.template_urls
            }, self.instance_id));
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
        var range = Array.isArray(range) ? range[0] : range;
        var self = this;

        var annotation = {
            annotationText: [],
            ranges: [range],
            id: $.getUniqueId(),
            exact: $.getQuoteFromHighlights([range]).exact,
            mediaType: "text"
        };
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.TargetSelectionMade(annotation, event);
        });
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.draw(annotation);
        });

        // jQuery('.annotator-wrapper')[0].focus();

        //$.publishEvent('ViewerEditorOpen', self.instance_id, [annotation]);
    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationDraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationDraw = function() {

    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationUndraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationUndraw = function() {

    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorOpen (name)
     */
    $.TextTarget.prototype.ViewerEditorOpen = function(annotation) {
        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorClose (name)
     */
    $.TextTarget.prototype.ViewerEditorClose = function(annotation) {
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerEditorClose(annotation, event);
        });
        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayOpen (name)
     */
    $.TextTarget.prototype.ViewerDisplayOpen = function(annotation) {
        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayClose (name)
     */
    $.TextTarget.prototype.ViewerDisplayClose = function(annotation) {
        return annotation;
    };
    
    /**
     * { function_description }
     *
     * @class      StorageAnnotationSave (name)
     */
    $.TextTarget.prototype.StorageAnnotationSave = function() {

    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationLoad (name)
     */
    $.TextTarget.prototype.StorageAnnotationLoad = function() {

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
    $.TextTarget.prototype.StorageAnnotationDelete = function() {

    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationGetReplies (name)
     */
    $.TextTarget.prototype.StorageAnnotationGetReplies = function() {

    };
}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
