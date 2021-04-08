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
        this.first_time = true;
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
        jQuery('.annotationSection.side').on('click', '.tag-token-tag', function() {
            if (jQuery(this).hasClass('active')) {
                jQuery('.tag-token-tag').removeClass('active');
                jQuery('.search-bar.side #search-clear').trigger('click');
            } else {
                jQuery('.tag-token-tag').removeClass('active');
                var tagFound = jQuery(this).html().trim();
                $.publishEvent('searchTag', self.instanceID, [tagFound]);
                jQuery('.search-bar #srch-term').val(tagFound);
                jQuery('.search-bar select').val('Tag');
                jQuery(this).addClass('active');
            }
        });
        self.setUpListeners();
    };

    $.SidebarTagTokens.prototype.removeTokens = function() {
        jQuery('.tag-token-list').remove();
    };

    $.SidebarTagTokens.prototype.setUpTokens = function() {
        var self = this;
        if (self.options.tagList.length === 0 || (self.options.tagList.length === 1 && self.options.tagList[0] === "")) {
            document.documentElement.style.setProperty('--sidebar-search-bar-height-open', (72) + "px")
            return;
        }
        if (self.first_time) {
            jQuery('#empty-alert').hide();
            self.first_time = false;
        }
        var tokenHTML = "<div class='tag-token-list'><span>Instructor Tags:</span><br><div class='tag-token-section'>";
        self.options.tagList.forEach(function(tag) {
            tokenHTML += '<div role="button" tabIndex="0" class="tag-token-tag">' + tag + '</div>';
        });
        tokenHTML += "</div></div>";
        jQuery('.search-bar.side').after(tokenHTML);
        setTimeout(function() {
            var tag_list_height = jQuery('.annotationSection > .tag-token-list').height()
            document.documentElement.style.setProperty('--sidebar-search-bar-height-open', (tag_list_height + 72) + "px")
            jQuery('#empty-alert').show();
        }, 150);
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
