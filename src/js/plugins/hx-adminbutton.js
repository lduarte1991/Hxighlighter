/**
 *  AdminButton Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-adminbutton.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.AdminButton = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.AdminButton.prototype.init = function() {
        var self = this;
        if (self.options.AdminButton) {
            self.url = self.options.AdminButton.homeURL;
            self.allowed = self.options.AdminButton.has_staff_permissions;
            // console.log(self.url, self.allowed);
            if (self.allowed && self.url && self.url != '') {
                self.setUpButtons();
            } else {
                jQuery(self.options.slot).before('<div class="sidebar-navbar"></div>');
            }
        }
    };

    $.AdminButton.prototype.setUpButtons = function() {
        var self = this;
        jQuery(self.options.slot).before('<div class="sidebar-navbar"><a href="'+self.url+'" title="Admin Hub" aria-label="Admin Hub" id="homebutton" role="button"><span class="fas fa-users-cog"></span></button></div>');
    };

    $.AdminButton.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.AdminButton, 'name', {
        value: "AdminButton"
    });


    $.plugins.push($.AdminButton);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
