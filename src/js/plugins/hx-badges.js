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
        $.subscribeEvent('decreaseBadgeCount', self.instanceID, function(_, elem, content_id) {
            var count = jQuery(elem).data('hxbadge');
            if (count) {
                self.updateBadge(elem, count - 1, content_id);
            }
        })

        $.subscribeEvent('increaseBadgeCount', self.instanceID, function(_, elem, content_id) {
            // toastr.info("Annotation was created and can be seen when 'Mine' filter is turned on.")

            var count = jQuery(elem).data('hxbadge');
            if (count) {
                self.updateBadge(elem, count + 1, content_id);
            } else {
                self.addBadge(elem, 1, content_id);
            }
        });

        $.subscribeEvent('updateBadge', self.instanceID, function(_, elem, counter) {
            self.updateBadge(elem, counter);
        });
        $.subscribeEvent('clearBadge', self.instanceID, function(_, elem) {
            self.clearBadge(elem);
        });
    };

    $.Badges.prototype.addBadge = function(elem, counter, content_id) {
        var self = this;
        // create a badge to go in the top-right corner
        jQuery(elem).append('<span class="hx-badge" aria-label="'+counter+' new unread">' + counter + "</span>");
        // add counter to data('hxbadge')
        jQuery(elem).data('hxbadge', counter);
        var content = [];
        if (typeof(content_id) != "undefined") {
            content = Array.isArray(content_id) ? content_id : [content_id];
        }
        jQuery(elem).data('hxbadge-content', content)
        // add click event listener that will automatically clear badge when clicked
        jQuery(elem).click(function() {
            self.clearBadge(elem);
        })
    };

    $.Badges.prototype.updateBadge = function(elem, counter, content_id) {
        var self = this;
        jQuery(elem).find('.hx-badge').html(counter);  
        var content = jQuery(elem).data('hxbadge-content');
        if (typeof(content_id) !== "undefined") {
            if (content.indexOf(content_id) > -1) {
                content.splice(content.indexOf(content_id))
                if (content.length == 0) {
                    self.clearBadge(elem)
                } else {
                    jQuery(elem).data('hxbadge', counter);
                }
            } else {
                content.push(content_id);
                jQuery(elem).data('hxbadge', counter);
            }
            jQuery(elem).data('hxbadge-content', content)
        }
    };

    $.Badges.prototype.clearBadge = function(elem) {
        jQuery(elem).find('.hx-badge').remove();
        jQuery(elem).removeData('hxbadge');
        jQuery(elem).removeData('hxbadge-content');
    };

    $.Badges.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.Badges, 'name', {
        value: "Badges"
    });


    $.plugins.push($.Badges);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
