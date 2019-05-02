/**
 *  Simple Tags Plugin
 *  
 *  Will create an area for inputting tags, just a textfield, no color
 *
 */

require('./hx-simpletags-plugin.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.SimpleTags = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.init();
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.SimpleTags.prototype.init = function() {
        var self = this;
        self.name = 'SimpleTags';

        var ed = "<input type='text' name='tags' id='tag-list' class='hx-text-field' placeholder='Add tags...' />";
        
        self.editorElement = ('editorElement' in self.options) ? self.options.editorElement : ed;
    };


    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.SimpleTags.prototype.returnValue = function() {
        var self = this;
        var delimiter = ('delimiter' in self.options) ? self.options.delimiter : ',';
        result = jQuery('#tag-list').val().split(delimiter);
        return result;
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.SimpleTags.prototype.annotationListeners = function() {
        var self = this;
    };

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.SimpleTags.prototype.saving = function(annotation) {
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
    $.SimpleTags.prototype.editorShown = function(editor, annotation) {
        var self = this;
        editor.find('.plugin-area').append(self.editorElement);
        if (annotation.tags && annotation.tags.length > 0) {
            var tagList = annotation.tags.join(',');
            editor.find('#tag-list').val(tagList);
        }
    };

    Object.defineProperty($.SimpleTags, 'name', {
        value: "SimpleTags"
    });


    $.plugins.push($.SimpleTags);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
