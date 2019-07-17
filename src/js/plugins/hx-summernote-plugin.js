/**
 *  Summernote RichText Plugin
 *  
 *  Should be generic, but its main purpose is to be used in tandem with annotations.
 *
 */
require('bs4-summernote/dist/summernote-bs4.css')
require('bs4-summernote');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.SummernoteRichText = function(options, instanceID) {
        var maxLength = 1000;
        this.options = jQuery.extend({
            height: 100,
            focus: true,
            width: 398,
            placeholder: "Add annotation text...",
            maximumImageFileSize: 262144,
            maxTextLength: maxLength,
            callbacks: {
                onKeydown:  function (e) {
                    var t = e.currentTarget.innerText;
                    if (t.trim().length >= maxLength) {
                        // delete key
                        if (e.keyCode != 8){
                            e.preventDefault();
                        }
                    }
                },
                onKeyup: function(e) {
                    var t = e.currentTarget.innerText;
                    jQuery('#maxContentPost').text(maxLength - t.trim().length);
                },
                onPaste: function (e) {
                    var t = e.currentTarget.innerText;
                    var bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('Text');
                            
                    if (t.length + bufferText.length >= maxLength) {
                        e.preventDefault();
                        var bufferTextAllowed = bufferText.trim().substring(0, maxLength - t.length);
                        setTimeout(function() { // wrap in a timer to prevent issues in Firefox
                            document.execCommand('insertText', false, bufferTextAllowed);
                            jQuery('#maxContentPost').text(maxLength - t.length);
                        }, 10)
                    }
                }
            },
            toolbar: [
                ['style', ['style']],
                ['font', ['bold', 'italic', 'underline', 'clear']],
                ['fontsize', ['fontsize']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['insert', ['table', 'link', 'hr']],
                ['view', ['codeview']],
            ],
        }, options);
        this.init();
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.SummernoteRichText.prototype.init = function() {
        
        // warns dev that they forgot to include summernote.js
        if (typeof jQuery.summernote !== "object") {
            console.log("You must include summernote.js and summernote.css on this page in order to use this plugin");
        }
    };

    /**
     * 
     * @param element {HTMLElement} - where the annotation will be added
     * @param selector {String} - selector to find input it is replacing
     */
    $.SummernoteRichText.prototype.addWYSIWYG = function(element, selector) {
        var self = this;

        // adds the summernote WYSIWIG to the editor to the selector's location
        this.elementObj = element.find(selector);
        this.options.width = this.elementObj.parent().width();
        this.elementObj.summernote(this.options);

        // removes summernote's ability to tab within the editor so users can tab through items
        delete jQuery.summernote.options.keyMap.pc.TAB;
        delete jQuery.summernote.options.keyMap.mac.TAB;
        delete jQuery.summernote.options.keyMap.pc['SHIFT+TAB'];
        delete jQuery.summernote.options.keyMap.mac['SHIFT+TAB'];

        element.find('.note-editable').trigger('focus');
        jQuery('.note-editor button').attr('tabindex', '0');
    };

    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.SummernoteRichText.prototype.returnValue = function() {
        var result = this.elementObj.summernote('code');
        if (result.indexOf('<script') >= 0) {
            alert("I'm sorry Colin, I'm afraid I can't do that. Only you wil be affected by the JS you entered. It will be escaped for everyone else.");
            return result.replace('<script', '&lt;script').replace('</script>', '&lt;/script&gt;');
        }
        return result;
    };

    /**
     * Deletes the Summernote instance.
     *
     * @param      {HTMLElement}  element   The editor element
     * @param      {String}  selector  The selector containing the area in the editor where to insert the WYSIWYG
     */
    $.SummernoteRichText.prototype.destroy = function(element, selector) {
        this.elementObj.summernote('destroy');
        jQuery('.tooltip.fade').remove();
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.SummernoteRichText.prototype.annotationListeners = function() {
        var self = this;

        hxSubscribe('editorToBeHidden', self.instanceID, function(){
            self.destroy();
        }.bind(this));
    };

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.SummernoteRichText.prototype.saving = function(annotation) {
        var self = this;
        try {
            var annotationText = this.returnValue();

            if (typeof this.options.validator === "function") {
                annotationText = this.options.validator(annotationText);
            }

            annotation['annotationText'] = [annotationText];
        } catch(e) {
            console.log('plugin was never started');
        }
        self.destroy();
        return annotation;
    };

    /**
     * Code that runs once the editor is shown on screen.
     *
     * @param      {Annotation}  annotation  The annotation in case the user is editing and we need the text
     * @param      {HTMLElement}  editor      The editor element
     */
    $.SummernoteRichText.prototype.editorShown = function(editor, annotation) {
        var self = this;
        self.addWYSIWYG(editor, '#annotation-text-field');
        if (annotation.annotationText) {
            self.elementObj.summernote('code', annotation.annotationText);
        } else if (annotation.schema_version && annotation.schema_version === "catch_v2") {
            var annotationText = returnWAText(annotation);
            if (typeof annotationText !== "undefined") {
                self.elementObj.summernote('code', annotationText);
                self.updating = true;
                self.updatingText = annotationText;
            }
        }
    };

    $.SummernoteRichText.prototype.setUpEditor = function(type) {
        var type = type.toLowerCase();
        if (!type || type === "default" || type === "") {
            return [
                ['font', ['bold', 'italic', 'underline', 'clear']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['insert', ['table', 'link', 'hr']],
            ];
        }
        if (type === "simple") {
            return [
                ['font', ['bold', 'italic', 'underline', 'clear']]
            ]
        }

        var fullsetup = [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontsize', ['fontsize']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['height', ['height']],
            ['insert', ['table', 'link', 'hr', 'picture', 'video']],
            ['view', ['codeview']]
        ];

        if (type === "instructor") {
            return fullsetup;
        }

        if (type.indexOf('no-style')) {}
    }

    Object.defineProperty($.SummernoteRichText, 'name', {
        value: "SummernoteRichText"
    });


    $.plugins.push($.SummernoteRichText);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
