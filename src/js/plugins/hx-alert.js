/**
 *  HxAlert Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-alert.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.HxAlert = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.HxAlert.prototype.init = function() {
        var self = this;
        self.defaultOptions = {
            buttons: [{title: 'OK', action: function() {self.current_alert.remove();}}, {title: 'Cancel', action: function() {self.current_alert.remove();}}],
            time: 0, // 0 = unlimited, 1 = 1 second, 2 = 2 seconds, ... etc.
            modal: false
        }
        jQuery('body').on('click', '.hx-notify .hx-notify-button.hx-close', function() {
            self.current_alert.removeClass('opened');
            setTimeout(function() {self.current_alert.remove()}, 1000);
        })
        $.subscribeEvent('HxAlert', self.instanceID, function(_, message, options) {
            var theseOptions = jQuery.extend({}, self.defaultOptions, options);
            constructedAlert = self.createNotification(message, theseOptions.modal, theseOptions.buttons);
            jQuery('body').append(constructedAlert);

            // if (theseOptions.modal) {
            //     self.current_alert = jQuery('.hx-modal');
            // } else {
                self.current_alert = jQuery('.hx-notify');
                jQuery.each(self.current_alert.find('button'), function(idx, but) {
                    if (jQuery(but).hasClass('hx-close')) {
                        return;
                    }
                    var currTitle = jQuery(but).html().trim();
                    var onclick = theseOptions.buttons.find(function(b) { if (b.title == currTitle) {return b}}).action;
                    jQuery(but).on('click', onclick);
                });
                setTimeout(function() { self.current_alert.addClass('opened'); }, 500);
            // }
            if (theseOptions.time !== 0) {
                setTimeout(function() { self.current_alert.removeClass('opened'); }, (theseOptions.time * 1000));
                setTimeout(function() { self.current_alert.remove(); }, ((theseOptions.time + 1) * 1000));
            }
            return;
        });
    };

    $.HxAlert.prototype.createNotification = function(message, isModal, buttons) {
        var buttonsHTML = "<button class='hx-notify-button hx-close'><span class='fa fa-close'></span></button>";
        if (buttons.length > 0) {
            buttonsHTML = "";
            buttons.forEach(function(b) {
                buttonsHTML += "<button class='hx-notify-button'>" + b.title + "</button>"
            });
        }
        var notificationHTML = "<div class='hx-notify'>"+message+"<div class='hx-notify-button-group'>"+buttonsHTML+"</div></div>";
        // if (isModal) {
        //     notificationHTML = "<div class='hx-modal'>" + notificationHTML + "</div>";
        // }

        return notificationHTML;
    };

    $.HxAlert.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.HxAlert, 'name', {
        value: "HxAlert"
    });


    $.plugins.push($.HxAlert);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
