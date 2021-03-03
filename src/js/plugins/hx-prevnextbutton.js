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
        var toAppend = "";
        var toPrepend = "";
        if (self.prevUrl && self.prevUrl != "") {
            toPrepend += '<a href="'+self.prevUrl+'" title="Previous Page" id="prevButtonNavTop" role="button">Previous</button>';

            //toPrepend += '<a href="'+self.prevUrl+'" title="Previous Page" id="prevButtonTop" role="button">Previous</button>';
            toAppend += '<a href="'+self.prevUrl+'" title="Previous Page" id="prevButtonBottom" role="button">Previous</button>';
            //jQuery(self.options.slot).append('<a href="'+self.prevUrl+'" title="Previous Page" id="prevButton" role="button">Previous</button>');
        }
        if (self.nextUrl && self.nextUrl != "") {
            toPrepend += '<a href="'+self.nextUrl+'" title="Next Page" id="nextButtonNavTop" role="button">Next</button>';

            //toPrepend += '<a href="'+self.nextUrl+'" title="Next Page" id="nextButtonTop" role="button">Next</button>';
            toAppend += '<a href="'+self.nextUrl+'" title="Next Page" id="nextButtonBottom" role="button">Next</button>';
            //jQuery(self.options.slot).append('<a href="'+self.nextUrl+'" title="Next Page" id="nextButton" role="button">Next</button>');
        }

        jQuery('.sidebar-navbar').append(toPrepend)
        //jQuery(self.options.slot).before(toPrepend);
        if (self.options.mediaType === "text") {
            jQuery(self.options.slot).append(toAppend);
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
