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
        if (this.elementObj != undefined) {
            return;
        }

        // adds the summernote WYSIWIG to the editor to the selector's location
        this.elementObj = element.find(selector);
        var newOptions = jQuery.extend({}, this.options, {'width': element.outerWidth()-24});
        this.elementObj.summernote(newOptions);

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
        this.elementObj = undefined;
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
                var ann_display = viewer.find('.item-'+annotation.id);
                self.annotationShown(viewer.find('.item-'+annotation.id), annotation, false);
            });
        } else {
            self.annotationShown(viewer, annotations, true);
        }
    };

    $.Reply.prototype.annotationShown = function(viewer, annotation,isSidebar) {
        var self = this;
        var prefix = isSidebar ? "sidebar-" : "other-";
        
        jQuery(viewer).find('.plugin-area-bottom').append('<div class="reply-area-'+annotation.id+'"><button class="view-replies" style="display:none;" id="' + prefix + 'replies-'+annotation.id+'">View ' + self.pluralize(annotation.totalReplies, 'Reply', 'Replies') + '</button><div class="'+prefix+'reply-list" style="display:none;"></div><div class="create-reply-area" id="' + prefix + 'create-reply-area-'+annotation.id+'" style="display:none;"><textarea id="' + prefix + 'reply-textarea-'+annotation.id+'"></textarea><button id="' + prefix + 'save-reply-'+annotation.id+'">Save</button><button id="' + prefix + 'cancel-reply-'+annotation.id+'">Cancel</button></div><button class="create-reply" id="' + prefix + 'reply-'+annotation.id+'">Reply to Annotation</button></div>');
        if (('totalReplies' in annotation) && annotation.totalReplies > 0) {
            jQuery(viewer).find('.reply-area-' + annotation.id + " .view-replies").show();
            jQuery(viewer).find('.reply-area-' + annotation.id + " .create-reply").hide();
        }
        jQuery(viewer).find('.plugin-area-bottom #'+prefix+'reply-' + annotation.id).click(function() {
            if (jQuery('.note-editor.card').length > 0) {
                return;
            }
            jQuery('#'+prefix+'create-reply-area-' + annotation.id).show();
            self.addWYSIWYG(viewer, '#'+prefix+'reply-textarea-' + annotation.id);
            jQuery(this).hide();
        });

        jQuery(viewer).find('.plugin-area-bottom .reply-area-' + annotation.id + ' .view-replies').click(function() {
            jQuery(viewer).find('.reply-area-' + annotation.id + " .view-replies").hide();
            jQuery(viewer).find('.reply-area-' + annotation.id + " .create-reply").show();
            jQuery(viewer).find('.' + prefix + 'reply-list').html('');
            $.publishEvent('GetSpecificAnnotationData', self.instanceID, [annotation.id, function(ann) {
                self.viewRepliesToAnnotation(ann, viewer, prefix);
            }]);
            
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
                    created: new Date(),
                    media: 'comment',
                    creator: {
                        name: self.options.username,
                        id: self.options.user_id
                    }
                }

                $.publishEvent('StorageAnnotationSave', self.instanceID, [reply, false]);
                annotation.totalReplies++;
                (typeof(annotation.replies) == "undefined")  ? annotation.replies = [reply] : annotation.replies.push(reply);
                annotation._local.highlights.forEach(function(high) {
                    jQuery(high).data('annotation', annotation);
                });
                self.addReplyToViewer(viewer, reply, prefix);
                self.destroy();
                if (prefix === "other-") {
                    if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').hide();
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').show();
                        jQuery('.side.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class$=reply-list]').hide();
                    }
                } else {
                    if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                        jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                        jQuery('.floating.ann-item.item-'+annotation.id+' .create-reply').hide();
                        jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').show();
                        jQuery('.floating.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class$=reply-list]').hide();
                    }
                }
                jQuery('#'+prefix+'create-reply-area-' + annotation.id).hide();
                jQuery(viewer).find('.create-reply').show();
                jQuery(viewer).find('.plugin-area-bottom div[class$=reply-list]').show();
                //jQuery('.ann-item.item-'+annotation.id+' div[class$=reply-list]').show();
            });
    };

    $.Reply.prototype.viewRepliesToAnnotation = function(annotation, viewer, prefix) {
        var self = this;
        if (annotation.totalReplies > 0) {
            if (annotation.replies && annotation.totalReplies == annotation.replies.length) {
                annotation.replies.forEach(function(rep) {
                    self.addReplyToViewer(viewer, rep, prefix);
                });
            } else {
                console.log(annotation._local, annotation.totalReplies, annotation.replies);
                self.retrieveRepliesForAnnotation(annotation, viewer, prefix);
            }
        }
        jQuery(viewer).find('.' + prefix + 'reply-list').show();
    };

    $.Reply.prototype.retrieveRepliesForAnnotation = function(annotation, viewer, prefix) {
        var self = this;
        $.publishEvent('StorageAnnotationGetReplies', self.instanceID, [{
            'source_id': annotation.id,
            'media': 'Annotation'
        }, function(results, converter) {
            results.rows.forEach(function(reply) {
                var rep = converter(reply)
                self.addReplyToViewer(viewer, rep, prefix);
                annotation.replies ? (annotation.replies.push(rep)) : (annotation.replies = [rep])
            });
            if (annotation.totalReplies !== results.rows.length) {
                annotation.totalReplies = results.rows.length;
            }
            console.log("LOOK HERE", annotation);
            annotation._local.highlights.forEach(function(high) {
                jQuery(high).data('annotation', annotation);
            });
        }])
    };

    $.Reply.prototype.addReplyToViewer = function(viewer, reply, prefix) {
        var self = this;
        console.log(reply);
        jQuery(viewer).find('.plugin-area-bottom div[class$=reply-list]').append("<div class='reply reply-item-" + reply.id + "'>" + "<strong>" + reply.creator.name + "</strong> ("+jQuery.timeago(reply.created)+"):" + reply.annotationText.join('<br><br>') + "</div>");
                
        // check to see if viewer is open or sidebar has annotation and add it there too
    };

    $.Reply.prototype.pluralize = function(num, singular, plural) {
        return num == 1 ? ('1 ' + singular) : (num + ' ' + plural);
    };

    Object.defineProperty($.Reply, 'name', {
        value: "Reply"
    });


    $.plugins.push($.Reply);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
