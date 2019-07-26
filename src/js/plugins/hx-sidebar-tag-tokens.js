/**
 *  SidebarTagTokens Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-sidebar-tag-tokens.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.SidebarTagTokens = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.SidebarTagTokens.prototype.init = function() {
        var self = this;
        // console.log(this);
        var search_button = jQuery('.btn.user-filter#search');
        search_button.click(function() {
            self.removeTokens();
            setTimeout(function() {
                self.setUpTokens();
            }, 250);
        });
        jQuery('.search-bar.side #search-submit').click(function() {
            jQuery('.tag-token-tag').removeClass('active');
        });
        jQuery('.search-bar.side #search-clear').click(function() {
            jQuery('.tag-token-tag').removeClass('active');
        });
        jQuery('.search-bar.side').on('click', '.tag-token-tag', function() {
            if (jQuery(this).hasClass('active')) {
                jQuery('.tag-token-tag').removeClass('active');
                jQuery('.search-bar.side #search-clear').trigger('click');
            } else {
                jQuery('.tag-token-tag').removeClass('active');
                var tagFound = jQuery(this).html().trim();
                $.publishEvent('searchTag', self.instanceID, [tagFound]);
                jQuery(this).addClass('active');
            }
        });
    };

    $.SidebarTagTokens.prototype.removeTokens = function() {
        jQuery('.tag-token-list').remove();
    };

    $.SidebarTagTokens.prototype.setUpTokens = function() {
        var self = this;
        console.log("SETTING UP TOKENS", self.options.tagList);
        var tokenHTML = "<div class='tag-token-list'><span>Top Tags:</span><br>";
        self.options.tagList.forEach(function(tag) {
            tokenHTML += '<div role="button" tabIndex="0" class="tag-token-tag">' + tag + '</div>'
        });
        tokenHTML += "</div>";
        jQuery('.search-bar.side').append(tokenHTML);
    };

    $.SidebarTagTokens.prototype.saving = function(annotation) {
        return annotation;
    };

    $.SidebarTagTokens.prototype.setUpListeners = function() {
        var self = this;
        $.subscribeEvent('searchSelected', self.instanceID, function() {
            setTimeout(function() {
                self.setUpTokens();
            }, 250);
        });
    };

    Object.defineProperty($.SidebarTagTokens, 'name', {
        value: "SidebarTagTokens"
    });


    $.plugins.push($.SidebarTagTokens);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
