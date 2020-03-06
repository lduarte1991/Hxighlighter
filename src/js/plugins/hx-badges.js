/**
 *  Badges Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-badges.css');


(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.Badges = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.Badges.prototype.init = function() {
        var self = this;
        //console.log('test!');
        self.setUpListeners();
        toastr.options = {
            progressBar: true,
            preventDuplicates: true,
            'showDuration': '400',
            'hideDuration': '1000',
            timeOut: '7000',
            'positionClass': 'toast-top-left'
        }
    };

    $.Badges.prototype.setUpListeners = function() {
        var self = this;
        $.subscribeEvent('addBadge', self.instanceID, function(_, elem, counter) {
            if (jQuery(elem).data('hxbadge')) {
                self.updateBadge(elem, counter);
            } else {
                self.createBadge(elem, counter);
            }
        });
        $.subscribeEvent('increaseBadgeCount', self.instanceID, function(_, elem) {
            toastr.info("Annotation was created and can be seen when 'Mine' filter is turned on.")

            var count = jQuery(elem).data('hxbadge');
            if (count) {
                self.updateBadge(elem, count + 1);
            } else {
                self.addBadge(elem, 1);
            }
        });
        $.subscribeEvent('updateBadge', self.instanceID, function(_, elem, counter) {
            self.updateBadge(elem, counter);
        });
        $.subscribeEvent('clearBadge', self.instanceID, function(_, elem) {
            self.clearBadge(elem, counter);
        });
    };

    $.Badges.prototype.addBadge = function(elem, counter) {
        var self = this;
        // create a badge to go in the top-right corner
        jQuery(elem).append('<span class="hx-badge" aria-label="'+counter+' new unread">' + counter + "</span>");
        // add counter to data('hxbadge')
        jQuery(elem).data('hxbadge', counter);
        // add click event listener that will automatically clear badge when clicked
        jQuery(elem).click(function() {
            self.clearBadge(elem);
        })
    };

    $.Badges.prototype.updateBadge = function(elem, counter) {
        jQuery(elem).find('.hx-badge').html(counter);
        jQuery(elem).data('hxbadge', counter);
    };

    $.Badges.prototype.clearBadge = function(elem) {
        jQuery(elem).find('.hx-badge').remove();
        jQuery(elem).removeData('hxbadge');
    };

    $.Badges.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.Badges, 'name', {
        value: "Badges"
    });


    $.plugins.push($.Badges);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
