/**
 *  Toggle Annotations Plugin
 *  
 *
 */

require('./hx-toggle-annotations.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.ToggleAnnotations = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.on = true;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.ToggleAnnotations.prototype.init = function() {
        var self = this;
        self.setUpButton();
    };

    $.ToggleAnnotations.prototype.setUpButton= function() {
        var self = this;
        jQuery(self.options.slot).prepend('<button class="hx-toggle-annotations btn btn-default"></button>');
        jQuery(self.options.slot).find('.hx-toggle-annotations').click(function() {
            var toggleButton = jQuery(this);
            if (!toggleButton.hasClass('should-show')) {
                $.publishEvent('undrawAll', self.instanceID, [function(annList) {
                    self.tempAnnotationList = annList;
                    self.on = false;
                    toggleButton.addClass('should-show');
                }]);
            } else {
                $.publishEvent('drawList', self.instanceID, [self.tempAnnotationList, function() {
                    self.tempAnnotationList = [];
                    self.on = true;
                    toggleButton.removeClass('should-show');
                }]);
            }
        });
    };

    $.ToggleAnnotations.prototype.editorShown = function() {
        var self = this;
        if (!self.on) {
            $.publishEvent('drawList', self.instanceID, [self.tempAnnotationList, function() {
                self.tempAnnotationList = [];
                self.on = true;
                jQuery(self.options.slot).find('.hx-toggle-annotations').removeClass('should-show');
            }]);
        }
    };

    $.ToggleAnnotations.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.ToggleAnnotations, 'name', {
        value: "ToggleAnnotations"
    });


    $.plugins.push($.ToggleAnnotations);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
