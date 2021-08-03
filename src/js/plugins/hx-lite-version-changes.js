/**
 *  LiteVersionChanges Annotations Plugin
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
    $.LiteVersionChanges = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.LiteVersionChanges.prototype.init = function() {
        var self = this;
        jQuery('button.user-filter').css('display', 'none');
        jQuery('.annotationsHolder.side').css({
            'height': "calc(100% - 27px)",
            'margin-top': '27px'
        });
        jQuery('body').css('overflow-y', 'initial!important');
        if (self.options.authoring_mode) {
            jQuery('.annotationSection.side nav').append('<button id="hx-print-annotations" class="sidebar-button" role="button" tabindex="0" aria-label="Download Annotations JSON" style="left:34px; background: transparent; color: #595959; font-size: 17px;"><span class="fas fa-download"></span></button>')
            jQuery('body').on('click', '#hx-print-annotations', function() {
                var downloadFun = function(list) {
                    var annotationList = {
                        rows: list
                    };
                    var new_page = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(annotationList, null, 4));
                    var downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href",     new_page);
                    downloadAnchorNode.setAttribute("download", "annotations.json");
                    document.body.appendChild(downloadAnchorNode); // required for firefox
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                }
                $.publishEvent('downloadAnnotations', self.instanceID, [downloadFun]);
            });
        } else {
            jQuery('.keyboard-toggle').css('display', 'none');
        }
    };

    $.LiteVersionChanges.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.LiteVersionChanges, 'name', {
        value: "LiteVersionChanges"
    });

    var exclude_plugins = ['SidebarTagTokens', 'AdminButton', 'Reply', 'Websockets', 'ExportPlugin'];
    $.plugins = $.plugins.filter(plug => exclude_plugins.indexOf(plug.name) == -1);

    $.plugins.push($.LiteVersionChanges);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
