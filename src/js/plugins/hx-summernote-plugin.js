/**
 *  Summernote RichText Plugin
 *  
 *  Should be generic, but its main purpose is to be used in tandem with annotations.
 *
 */
require('bs4-summernote/dist/summernote-bs4.css')
require('bs4-summernote/dist/summernote-bs4.js');
require('./hx-summernote-plugin.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.SummernoteRichText = function(options, instanceID) {
        var self = this;
        var maxLength = 1000;
        // console.log("SummernoteRichText Options Sent:", options);
        this.options = options;
        var toolbar = [
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontsize', ['fontsize']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['insert', ['table', 'link', 'hr']],
        ];
        if (self.options.instructors.indexOf(self.options.user_id) > -1) {
            toolbar = [
                ['style', ['style']],
                ['font', ['bold', 'italic', 'underline', 'clear']],
                ['fontsize', ['fontsize']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['insert', ['table', 'link', 'hr', 'picture', 'video']],
                ['view', ['codeview']]
            ]
        }

        this.summernoteOpts = jQuery.extend({
            height: 150,
            focus: true,
            width: 435,
            placeholder: "Add annotation text...",
            maximumImageFileSize: 262144,
            maxHeight: 400,
            minHeight: 100,
            maxTextLength: maxLength,
            dialogsInBody: true,
            disableResizeEditor: true,
            disableDragAndDrop: true,
            onCreateLink: function(link) {
                var linkValidator = /(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+/
                if (link.match(linkValidator)) {
                    linkUrl = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/.test(link)? link : 'http://' + link;
                    return linkUrl;
                } else {
                    alert("You did not enter a valid URL, it has been removed.");
                    return 'http://example.org';
                }
            },
            callbacks: {
                onKeydown:  function (e) {
                    var t = e.currentTarget.innerText;
                    if ('Escape' === (e.key)) {
                        $.publishEvent('ViewerEditorClose', self.instanceID, [self.currentAnnotation, true, true]);
                        jQuery('.sr-real-alert').html('You have closed the editor and unselected text for annotation.');
                    } else if (t.trim().length >= maxLength) {
                        // prevents everything that could add a new character
                        var allowedKeys = 'ArrowLeftArrowRightArrowDownDeleteArrowUpMetaControlAltBackspace';
                        if (allowedKeys.indexOf(e.key) == -1 ||  (e.key == 'a' && !(e.ctrlKey || e.metaKey)) || (e.key == 'c' && !(e.ctrlKey || e.metaKey)) || (e.key == 'v' && !(e.ctrlKey || e.metaKey))){
                            e.preventDefault();
                            alert('You have reached the character limit for this annotation (max 1000 characters).')
                        }
                    }

                    
                },
                onKeyup: function(e) {
                    var t = e.currentTarget.innerText;
                    jQuery('#maxContentPost').text(maxLength - t.trim().length);
                },
                onPaste: function (e) {
                    var t = e.currentTarget.innerText;
                    var bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text');
                    var bufferHTML = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text/html');

                    if (bufferHTML.indexOf('<img') > -1 && (self.options.instructors.indexOf(self.options.user_id) == -1) ) {
                        var regex = new RegExp(/<img([\w\W ]+?)\/?>/g)
                        var inside = bufferHTML.match(regex);
                        jQuery.each(inside, function(_, image_tags) {
                            new_img_url = image_tags.match(/src\s*=\s*["'](.+?)["']/)[1];
                            bufferHTML = bufferHTML.replace(image_tags, '<a title="'+ new_img_url +'" href=\"' + new_img_url + "\">[External Image Link]</a>");
                        });
                        // bufferHTML = bufferHTML.replace(/img([\w\W]+?)\/?>/, "<a href=\"#\">[Link to external image]</a>");
                        console.log(bufferHTML)
                        setTimeout(function() { // wrap in a timer to prevent issues in Firefox
                            self.elementObj.summernote('code', bufferHTML);
                            jQuery('#maxContentPost').text(maxLength);
                            alert('You may have pasted an image. It will be converted to a link.');
                        }, 100)
                    }
                            
                    if (t.length + bufferText.length >= maxLength) {
                        e.preventDefault();
                        var bufferTextAllowed = bufferText.trim().substring(0, maxLength - t.length);
                        setTimeout(function() { // wrap in a timer to prevent issues in Firefox
                            document.execCommand('insertText', false, bufferTextAllowed);
                            jQuery('#maxContentPost').text(maxLength - t.length);
                            alert('You have reached the character limit for this annotation (max 1000 characters). Your pasted text was trimmed to meet the 1000 character limit.')
                        }, 10)
                    }
                },
                onChange: function(contents, $editable) {
                    console.log($editable);
                    if ($editable && contents.length > maxLength) {
                        $editable.html(contents.trim().substring(0, maxLength));
                    }
                },
                onFocus: function(e) {
                    $.publishEvent('wysiwygOpened', self.instanceID, [e]);
                },
            },
            toolbar: toolbar,
        }, this.options);
        // console.log("After init options", this.options);
        console.log('SUMMERNOTE', this.options);
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
            //console.log("You must include summernote.js and summernote.css on this page in order to use this plugin");
        }
        this.annotationListeners();
    };

    /**
     * 
     * @param element {HTMLElement} - where the annotation will be added
     * @param selector {String} - selector to find input it is replacing
     */
    $.SummernoteRichText.prototype.addWYSIWYG = function(element, selector) {
        var self = this;

        // adds the summernote WYSIWIG to the editor to the selector's location
        self.elementObj = element.find(selector);
        if(self.elementObj.closest('.side').length > 0) {
            self.summernoteOpts.width = self.elementObj.parent().width();
        } else {
            self.summernoteOpts.width = 435;
        }
        self.elementObj.summernote(self.summernoteOpts);

        // removes summernote's ability to tab within the editor so users can tab through items
        delete jQuery.summernote.options.keyMap.pc.TAB;
        delete jQuery.summernote.options.keyMap.mac.TAB;
        delete jQuery.summernote.options.keyMap.pc['SHIFT+TAB'];
        delete jQuery.summernote.options.keyMap.mac['SHIFT+TAB'];

        element.find('.note-editable').trigger('focus');
        jQuery('.note-editor button').attr('tabindex', '0');
        jQuery('.note-statusbar').hide();

        jQuery(document).on('mouseleave', function() {
            jQuery('.note-statusbar').trigger('mouseup');
            if (self.elementObj) {
                var editorObj = self.elementObj.closest('.annotation-editor');
                var newTop = parseInt(editorObj.css('top'), 10);;
                var newLeft = parseInt(editorObj.css('left'), 10);

                // console.log(editorObj, newTop, newLeft);

                if (newTop + editorObj.outerHeight() > window.innerHeight) {
                    newTop = window.innerHeight - editorObj.outerHeight();
                }
                if (newLeft + editorObj.outerWidth() > window.innerWidth) {
                    newLeft = window.innerWidth - editorObj.outerWidth();
                }
                if (newTop < 0) {
                    newTop = 0;
                }
                if (newLeft < 0) {
                    newLeft = 0;
                }
                editorObj.css({
                    top: newTop,
                    left: newLeft
                });
            }
        });
    };

    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.SummernoteRichText.prototype.returnValue = function() {
        var result = this.elementObj.summernote('code');
        if (result.indexOf('<script') >= 0) {
            alert("I'm sorry Dave, I'm afraid I can't do that. Only you wil be affected by the JS you entered. It will be escaped for everyone else.");
            return result.replace('<script', '&lt;script').replace('</script>', '&lt;/script&gt;');
        }
        result = result.replace(/<p><\/p>/g, '').replace(/<p><br><\/p>/g, '');
        return result;
    };

    /**
     * Deletes the Summernote instance.
     *
     * @param      {HTMLElement}  element   The editor element
     * @param      {String}  selector  The selector containing the area in the editor where to insert the WYSIWYG
     */
    $.SummernoteRichText.prototype.destroy = function(element, selector) {
        var self = this;
        self.elementObj.summernote('destroy');
        jQuery('.tooltip.fade').remove();
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.SummernoteRichText.prototype.annotationListeners = function() {
        var self = this;

        $.subscribeEvent('editorToBeHidden', self.instanceID, function(){
            self.destroy();
        }.bind(self));
        $.subscribeEvent('editorHidden', self.instanceID, function(){
            self.destroy();
        }.bind(self));


        // jQuery('body').on('mouseover','.btn.btn-primary.note-btn.note-btn-primary.note-link-btn', function() {
        //     var input = jQuery('.note-link-url.form-control.note-form-control.note-input');
        //     input.prop('type', 'url');
        //     var chosen = jQuery('.note-link-url.form-control.note-form-control.note-input').val();
        //     var expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
        //     var regex = new RegExp(expression);
        //     if (chosen.match(regex)){
        //         jQuery('.btn.btn-primary.note-btn.note-btn-primary.note-link-btn').prop('disabled', false);
        //     } else {
        //         jQuery('.btn.btn-primary.note-btn.note-btn-primary.note-link-btn').prop('disabled', true);
        //     }
        // });
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
            //console.log('plugin was never started');
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
        self.currentAnnotation = annotation;
        var annotationText = "";
        if ($.exists(annotation.annotationText)) {
            annotationText = annotation.annotationText;
            self.elementObj.summernote('code', annotation.annotationText);
        } else /*if (annotation.schema_version && annotation.schema_version === "catch_v2")*/ {
            annotationText = returnWAText(annotation);
            if (typeof annotationText !== "undefined") {
                self.elementObj.summernote('code', annotationText);
                self.updating = true;
                self.updatingText = annotationText;
            }
        }
        if (typeof(annotationText) === "string" ? annotationText.length > 0 : annotationText.join('').length > 0) {
            editor.find('.note-editable').attr('aria-label', 'Your current annotation text: <em>' + annotationText + "</em>. You are now in a text box. Edit your annotation.")
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
