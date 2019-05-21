/**
 *  Reply Plugin
 *  
 *
 */
require('bs4-summernote/dist/summernote-bs4.css')
require('bs4-summernote');
require('./hx-reply.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.Reply = function(options, instanceID) {
        this.options = jQuery.extend({
            height: 70,
            focus: true,
            width: 356,
            // airMode: true,
            placeholder: "Reply to annotation...",
            toolbar: [
                ['font', ['bold', 'italic', 'underline', 'link']],
            ],
        }, options);
        this.init();
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.Reply.prototype.init = function() {
        
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
    $.Reply.prototype.addWYSIWYG = function(element, selector) {
        var self = this;

        // adds the summernote WYSIWIG to the editor to the selector's location
        this.elementObj = element.find(selector);
        console.log(element.outerWidth());
        var newOptions = jQuery.extend({}, this.options, {'width': element.outerWidth()-24});
        console.log(newOptions);
        this.elementObj.summernote(newOptions);
        console.log(element.find(selector));

        // removes summernote's ability to tab within the editor so users can tab through items
        delete jQuery.summernote.options.keyMap.pc.TAB;
        delete jQuery.summernote.options.keyMap.mac.TAB;
    };

    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.Reply.prototype.returnValue = function() {
        var result = this.elementObj.summernote('code');
        if (result.indexOf('<script') >= 0) {
            alert('content contains javascript code that will be removed.');
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
    $.Reply.prototype.destroy = function(element, selector) {
        this.elementObj.val('');
        this.elementObj.summernote('destroy');
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.Reply.prototype.annotationListeners = function() {
        var self = this;
    };

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.Reply.prototype.saving = function(annotation) {
        return annotation;
    };

    /**
     * Code that runs once the display is shown on screen.
     *
     * @param      {Annotation}  annotation  The annotation in case the user is editing and we need the text
     * @param      {HTMLElement}  editor      The editor element
     */
    $.Reply.prototype.displayShown = function(viewer, annotations) {
        var self = this;
        if (Array.isArray(annotations)) {
            jQuery.each(annotations, function(_, annotation) {
                console.log(annotation);
                self.annotationShown(viewer.find('.item-'+annotation.id), annotation, false);
            });
        } else {
            self.annotationShown(viewer, annotations, true);
        }
    };

    $.Reply.prototype.annotationShown = function(viewer, annotation,isSidebar) {
        var self = this;
        console.log(viewer, annotation, isSidebar);
        var prefix = isSidebar ? "sidebar-" : "other-";
        if (!('totalReplies' in annotation) || annotation.totalReplies === 0) {
            jQuery(viewer).find('.plugin-area-bottom').append('<div class="'+prefix+'reply-list" style="display:none;"></div><div class="create-reply-area" id="' + prefix + 'create-reply-area-'+annotation.id+'" style="display:none;"><textarea id="' + prefix + 'reply-textarea-'+annotation.id+'"></textarea><button id="' + prefix + 'save-reply-'+annotation.id+'">Save</button><button id="' + prefix + 'cancel-reply-'+annotation.id+'">Cancel</button></div><button class="create-reply" id="' + prefix + 'reply-'+annotation.id+'">Reply to Annotation</button>');
        } else {
            jQuery(viewer).find('.plugin-area-bottom').append('<div class="'+prefix+'reply-list" style="display:none;"><div>Replies:</div></div><button class="view-replies" id="' + prefix + 'replies-'+annotation.id+'">View ' + annotation.totalReplies + ' replies');
        }

        jQuery(viewer).find('.plugin-area-bottom #'+prefix+'reply-' + annotation.id).click(function() {
            jQuery('#'+prefix+'create-reply-area-' + annotation.id).show();
            self.addWYSIWYG(viewer, '#'+prefix+'reply-textarea-' + annotation.id);
            jQuery(this).hide();
        });

        jQuery('#' + prefix + 'cancel-reply-' + annotation.id).click(function() {
                self.destroy();
                jQuery('#'+prefix+'create-reply-area-' + annotation.id).hide();
                jQuery('.create-reply').show();
            });
            jQuery('#' + prefix + 'save-reply-' + annotation.id).click(function() {
                var result = self.elementObj.summernote('code');
                if (result.indexOf('<script') >= 0) {
                    alert('content contains javascript code that will be removed.');
                    result = result.replace('<script', '&lt;script').replace('</script>', '&lt;/script&gt;');
                }

                var reply = {
                    annotationText: [result],
                    ranges: {
                        'type': 'Annotation',
                        'format': 'text/html',
                        'source': annotation.id
                    },
                    id: $.getUniqueId(),
                    exact: '',
                    media: 'comment',
                    creator: {
                        name: self.options.username,
                        id: self.options.user_id
                    }
                }
                console.log(result, reply);
                $.publishEvent('StorageAnnotationSave', self.instance_id, [reply, false]);
                annotation.totalReplies++;
                var singleAnnotation = jQuery('.annotator-hl').addBack().map(function(_, elem) {
                    var foundAnn = jQuery(elem).data('annotation');
                    if (foundAnn.id === annotation.id) {
                        return foundAnn;
                    }
                }).toArray();
                console.log(singleAnnotation);
                //jQuery(annotation._local.highlights).data('annotation', annotation);
                jQuery(viewer).find('.plugin-area-bottom div[class$=reply-list]').append("<div class='reply reply-item-" + reply.id + "'>" + "<strong>" + reply.creator.name + ":</strong> " + result + "</div>");
                
                if (prefix === "other-") {
                    console.log(jQuery('.ann-item.item-'+annotation.id+' .create-reply'), jQuery('.ann-item.item-'+annotation.id+' .create-reply:visible').length);
                    if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').html('View Replies');
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').addClass('view-replies');
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').removeClass('create-reply');
                    }
                }
                
                self.destroy();
                jQuery('#'+prefix+'create-reply-area-' + annotation.id).hide();
                jQuery('.ann-item.item-'+annotation.id+' .create-reply').show();
                jQuery('.ann-item.item-'+annotation.id+' div[class$=reply-list]').show();
            });
    }

    Object.defineProperty($.Reply, 'name', {
        value: "Reply"
    });


    $.plugins.push($.Reply);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
