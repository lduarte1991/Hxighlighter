/**
 *  DisplayResize Annotations Plugin
 *  
 *
 */
 var annotator = annotator ? annotator : require('annotator');
//uncomment to add css file
require('./hx-display-resize.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.DisplayResize = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        self.itemStretching = false;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.DisplayResize.prototype.init = function() {
        var self = this;
        self.setUpListeners();
    };

    $.DisplayResize.prototype.setUpListeners = function() {
        var self = this;
        Hxighlighter.subscribeEvent('DrawnSelectionClicked', self.instance_id, function(_, event1, annotations) {
            self.currentViewer.append('<div class="hx-resize resize-bar"></div>')
            self.currentViewer.find('.hx-resize.resize-bar').on('mousedown', function(event) {
                self.prepareToStretch(event);
            });
            jQuery(self.options.slot).on('mousemove', function(event) {
                self.stretch(event);
                if (self.itemStretching) {
                    jQuery('body').css('overflow', 'hidden');
                }
            });
            jQuery(self.options.slot).on('mouseup', function(event) {
                if (self.itemStretching) {
                    jQuery('body').css('overflow', 'inherit');
                }
                self.finishedStretching(event);
            });
            jQuery(self.options.slot).on('mouseleave', function(event) {
                self.finishedStretching(event);
            });
        });
    };

    $.DisplayResize.prototype.prepareToStretch = function(event) {
        var self = this;
        self.itemStretching = true;
        $.pauseEvent(event);
        self.initialPoint = annotator.util.mousePosition(event);
        self.initialHeight = self.currentViewer.height();
        // self.initialInnerHeight = self.currentViewer.find('.annotation-text-field').outerHeight() - 10;
    };

    $.DisplayResize.prototype.stretch = function(event) {
        var self = this;
        if (self.itemStretching) {
            var newPoint = annotator.util.mousePosition(event);
            var diff = newPoint.top - self.initialPoint.top;
            var newHeight = self.initialHeight + diff;
            var innerHeight = self.initialHeight + diff - 30;
            self.currentViewer.css('height', newHeight);
            self.currentViewer.find('.annotation-text-field').css({'max-height': innerHeight, 'height': innerHeight});
        }
    };

    $.DisplayResize.prototype.finishedStretching = function(event) {
        var self = this;
        self.itemStretching = false;
    };

    $.DisplayResize.prototype.saving = function(annotation) {
        return annotation;
    };

    $.DisplayResize.prototype.displayShown = function(viewer, annotations) {
        var self = this;
        if (Array.isArray(annotations)) {
            self.currentViewer = jQuery(viewer);
        }
    };

    Object.defineProperty($.DisplayResize, 'name', {
        value: "DisplayResize"
    });


    $.plugins.push($.DisplayResize);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
