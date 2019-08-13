/**
 *  PrevNextButton Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-prevnextbutton.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.PrevNextButton = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.PrevNextButton.prototype.init = function() {
        var self = this;
        if (self.options.PrevNextButton) {
            self.prevUrl = self.options.PrevNextButton.prevUrl;
            self.nextUrl = self.options.PrevNextButton.nextUrl;
            self.setUpButtons();
        }
    };

    $.PrevNextButton.prototype.setUpButtons = function() {
        var self = this;
        if (self.prevUrl && self.prevUrl != "") {
            jQuery(self.options.slot).append('<a href="'+self.prevUrl+'" title="Previous Page" id="prevButton" role="button">Previous</button>');
        }
        if (self.nextUrl && self.nextUrl != "") {
            jQuery(self.options.slot).append('<a href="'+self.nextUrl+'" title="Next Page" id="nextButton" role="button">Next</button>');
        }
    };

    $.PrevNextButton.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.PrevNextButton, 'name', {
        value: "PrevNextButton"
    });


    $.plugins.push($.PrevNextButton);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
