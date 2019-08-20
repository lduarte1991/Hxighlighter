/**
 *  HxStyleMine Annotations Plugin
 *  
 *
 */

//uncomment to add css file
//require('./filaname.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.HxStyleMine = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.HxStyleMine.prototype.init = function() {
        var self = this;
        self.setUpButtons();
    };

    $.HxStyleMine.prototype.setUpButtons = function() {
        var self = this;
        jQuery(self.options.slot).prepend('<button class="hx-style-mine btn btn-default" style="margin-right: 10px; width: 150px;">Underline Mine</button>');
        jQuery('.hx-style-mine').click(function() {
            if (jQuery(this).text().trim() == "Underline Mine") {
                jQuery('body').append('<style id="style-mine-underline">.annotation-mine { text-decoration: underline; text-decoration: underline dashed; }</style>')
                jQuery(this).html('Remove Underlines')
            } else {
                jQuery('#style-mine-underline').remove();
                jQuery(this).html('Underline Mine');
            }
        });
    };

    $.HxStyleMine.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.HxStyleMine, 'name', {
        value: "HxStyleMine"
    });


    $.plugins.push($.HxStyleMine);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
