/**
 *  Reply Plugin
 *  
 *
 */
require('bs4-summernote/dist/summernote-bs4.css')
require('bs4-summernote');
require('./hx-reply.css');
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'

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
        
        jQuery(viewer).find('.plugin-area-bottom').append('<div style="display: none;" class="reply-menu reply-menu-' + annotation.id + '"><button class="close-list-reply"><span class="fa fa-times-circle"></span></button><button class="sort-list-reply"><span class="fa fa-sort"></span></button></div><div class="reply-area-'+annotation.id+'"><button class="view-replies" style="display:none;" id="' + prefix + 'replies-'+annotation.id+'">View ' + self.pluralize(annotation.totalReplies, 'Reply', 'Replies') + '</button><div class="'+prefix+'reply-list" style="display:none;"></div><div class="create-reply-area" id="' + prefix + 'create-reply-area-'+annotation.id+'" style="display:none;"><textarea id="' + prefix + 'reply-textarea-'+annotation.id+'"></textarea><button id="' + prefix + 'save-reply-'+annotation.id+'">Save</button><button id="' + prefix + 'cancel-reply-'+annotation.id+'">Cancel</button></div><button class="create-reply" id="' + prefix + 'reply-'+annotation.id+'">Reply to Annotation</button></div>');
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
            jQuery(viewer).find('.' + prefix + 'reply-list').html('<div class="loading-obj" style="margin-top: 15px; text-align: center"><span class="make-spin fa fa-spinner"></span></div>');

            $.publishEvent('GetSpecificAnnotationData', self.instanceID, [annotation.id, function(ann) {
                self.viewRepliesToAnnotation(ann, viewer, prefix);
            }]);
        });

        jQuery(viewer).find('.plugin-area-bottom .reply-menu-' + annotation.id + ' .close-list-reply').click(function() {
            jQuery(viewer).find('.reply-area-' + annotation.id + " .view-replies").show();
            jQuery(viewer).find('.reply-area-' + annotation.id + " .create-reply").hide();
            jQuery(viewer).find('.'+prefix+'reply-list').hide();
            jQuery(viewer).find('.reply-menu').hide();
        });

        jQuery(viewer).find('.plugin-area-bottom .reply-menu-' + annotation.id + ' .sort-list-reply').click(function() {
            jQuery(viewer).find('.plugin-area-bottom .reply-area-' + annotation.id + ' div[class*=reply-list]').toggleClass('reversed');
        });

        jQuery('#' + prefix + 'cancel-reply-' + annotation.id).click(function() {
                self.destroy();
                jQuery('#'+prefix+'create-reply-area-' + annotation.id).hide();
                jQuery('#'+prefix+'reply-' + annotation.id).show();
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
                self.addReplyToViewer(viewer, reply, prefix, annotation);
                self.destroy();
                if (prefix === "other-") {
                    if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').hide();
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').show();
                        jQuery('.side.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class*=reply-list]').hide();
                        jQuery('.side.ann-item.item-'+annotation.id).find('.plugin-area-bottom .reply-menu').hide();
                    }
                } else {
                    if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                        jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                        jQuery('.floating.ann-item.item-'+annotation.id+' .create-reply').hide();
                        jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').show();
                        jQuery('.floating.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class*=reply-list]').hide();
                        jQuery('.floating.ann-item.item-'+annotation.id).find('.plugin-area-bottom .reply-menu').hide();
                    }
                }
                jQuery('#'+prefix+'create-reply-area-' + annotation.id).hide();
                jQuery(viewer).find('.create-reply').show();
                jQuery(viewer).find('.plugin-area-bottom div[class*=reply-list]').show();
                jQuery(viewer).find('.plugin-area-bottom .reply-menu').show();
                //jQuery('.ann-item.item-'+annotation.id+' div[class*=reply-list]').show();
            });
    };

    $.Reply.prototype.viewRepliesToAnnotation = function(annotation, viewer, prefix) {
        var self = this;
        if (annotation.totalReplies > 0) {
            if (annotation.replies && annotation.totalReplies == annotation.replies.length) {
                annotation.replies.forEach(function(rep) {
                    self.addReplyToViewer(viewer, rep, prefix, annotation);
                });
                jQuery('.loading-obj').remove();
            } else {
                self.retrieveRepliesForAnnotation(annotation, viewer, prefix);
            }
        }
        jQuery(viewer).find('.' + prefix + 'reply-list').show();
        jQuery(viewer).find('.reply-menu').show();
    };

    $.Reply.prototype.retrieveRepliesForAnnotation = function(annotation, viewer, prefix) {
        var self = this;
        $.publishEvent('StorageAnnotationSearch', self.instanceID, [{
            'source_id': annotation.id,
            'media': 'Annotation'
        }, function(results, converter) {
            jQuery('.loading-obj').remove();
            results.rows.reverse().forEach(function(reply) {
                var rep = converter(reply)
                self.addReplyToViewer(viewer, rep, prefix, annotation);
                annotation.replies ? (annotation.replies.push(rep)) : (annotation.replies = [rep])
            });
            if (annotation.totalReplies !== results.rows.length) {
                annotation.totalReplies = results.rows.length;
            }
            annotation._local.highlights.forEach(function(high) {
                jQuery(high).data('annotation', annotation);
            });
        }, function() {
            
        }])
    };

    $.Reply.prototype.addReplyToViewer = function(viewer, reply, prefix, annotation) {
        var self = this;
        jQuery(viewer).find('.plugin-area-bottom div[class*=reply-list]').append("<div class='reply reply-item-" + reply.id + "'><button class='delete-reply' tabindex='0'><span class='fa fa-trash'></span></button><strong>" + reply.creator.name + "</strong> ("+jQuery.timeago(reply.created)+"):" + reply.annotationText.join('<br><br>') + "</div>");
        jQuery('.reply.reply-item-' + reply.id + ' .delete-reply').confirm({
            'title': 'Delete Reply?',
            'content': 'Would you like to delete your reply? This is permanent.',
            'buttons': {
                confirm: function() {
                    $.publishEvent('StorageAnnotationDelete', self.instanceID, [reply]);
                    annotation.replies = annotation.replies.filter(function(ann) {
                        if (ann.id !== reply.id) {
                            return ann;
                        }
                    });
                    annotation.totalReplies--;
                    annotation._local.highlights.forEach(function(high) {
                        jQuery(high).data('annotation', annotation);
                    });
                    jQuery('.reply.reply-item-' + reply.id).remove();
                    jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                    if (annotation.totalReplies == 0) {
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').show();
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').hide();
                    } else {
                        jQuery('.side.ann-item.item-'+annotation.id+' .create-reply').hide();
                        jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').show();
                    }
                    jQuery('.side.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class*=reply-list]').hide();
                    jQuery('.side.ann-item.item-'+annotation.id).find('.plugin-area-bottom .reply-menu').hide();
                },
                cancel: function() {
                }
            } 
        });
    };

    $.Reply.prototype.pluralize = function(num, singular, plural) {
        return num == 1 ? ('1 ' + singular) : (num + ' ' + plural);
    };

    Object.defineProperty($.Reply, 'name', {
        value: "Reply"
    });


    $.plugins.push($.Reply);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
