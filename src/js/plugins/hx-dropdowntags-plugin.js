/**
 *  Dropdown (Predetermined) Tags Plugin
 *  
 *  Will create an area for inputting tags, just a textfield, no color
 *
 */

require('./hx-simpletags-plugin.js');
require('./hx-simpletags-plugin.css');
require('jquery-tokeninput/dist/css/token-input-facebook.min.css');
require('jquery-tokeninput');
require('./hx-dropdowntags-plugin.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.DropdownTags = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.init();
        this.name;
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.DropdownTags.prototype.init = function() {
        var self = this;
        self.name = 'DropdownTags';

    };


    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.DropdownTags.prototype.returnValue = function() {
        var self = this;
        var tags = jQuery('.token-input-token-facebook p').map(function(_, token) {
            return jQuery(token).html();
        });
        return Array.from(tags);
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.DropdownTags.prototype.annotationListeners = function() {
        var self = this;
    };

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.DropdownTags.prototype.saving = function(annotation) {
        var self = this;
        annotation.tags = self.returnValue() || [];
        return annotation;
    };

    /**
     * Code that runs once the editor is shown on screen.
     *
     * @param      {Annotation}  annotation  The annotation in case the user is editing and we need the text
     * @param      {HTMLElement}  editor      The editor element
     */
    $.DropdownTags.prototype.editorShown = function(editor, annotation) {
        var self = this;
        editor.find('#tag-list').addClass('token-tag-field');
        self.field = editor.find('.token-tag-field');

        var tags = ('tags' in self.options) ? self.options.tags : [];
        var preDTags = [];
        tags.forEach(function(tag) {
            preDTags.push({
                name: tag,
                value: tag
            })
        });
        self.field.tokenInput(preDTags, {'theme': 'facebook'});
        console.log(editor.find('#tag-list').val());
    };

    Object.defineProperty($.DropdownTags, 'name', {
        value: "DropdownTags"
    });

    $.plugins.push($.DropdownTags);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
