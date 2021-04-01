/**
 *  Reply Plugin
 *  
 *
 */
require('bs4-summernote/dist/summernote-bs4.css')
require('bs4-summernote/dist/summernote-bs4.js');
require('./hx-reply.css');
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.Reply = function(options, instanceID) {
        var self = this;
        this.options = jQuery.extend({
            height: 70,
            focus: true,
            width: 356,
            dialogsInBody: true,
            maximumImageFileSize: 262144,
            maxTextLength: 1000,
            // airMode: true,
            placeholder: "Reply to annotation...",
            toolbar: [
                ['font', ['bold', 'italic', 'underline', 'link']],
            ],
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
                onPaste: function (e) {
                    var t = e.currentTarget.innerText;
                    var bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text');
                    var bufferHTML = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text/html');

                    if (bufferHTML.indexOf('<img') > -1 && (self.options.instructors.indexOf(self.options.user_id) == -1) ) {
                        var regex = new RegExp(/<img([\w\W ]+?)\/?>/g)
                        var inside = bufferHTML.match(regex);
                        jQuery.each(inside, function(_, image_tags) {
                            var new_img_url = image_tags.match(/src\s*=\s*["'](.+?)["']/)[1];
                            if (new_img_url.indexOf('data:image') > -1) {
                                alert('You are not allowed to paste images in annotations. Add a descriptive link instead.')
                                bufferHTML = bufferHTML.replace(image_tags, '');
                            } else {
                                bufferHTML = bufferHTML.replace(image_tags, '<a title="'+ new_img_url +'" href=\"' + new_img_url + "\">[External Image Link]</a>");
                            }
                        });
                        // bufferHTML = bufferHTML.replace(/img([\w\W]+?)\/?>/, "<a href=\"#\">[Link to external image]</a>");
                        // console.log(bufferHTML)
                        setTimeout(function() { // wrap in a timer to prevent issues in Firefox
                            self.elementObj.summernote('code', bufferHTML);
                            jQuery('#maxContentPost').text(1000);
                            alert('You may have pasted an image. It will be converted to a link.');
                        }, 100)
                    }
                            
                    if (t.length + bufferText.length >= 1000) {
                        e.preventDefault();
                        var bufferTextAllowed = bufferText.trim().substring(0, 1000 - t.length);
                        setTimeout(function() { // wrap in a timer to prevent issues in Firefox
                            document.execCommand('insertText', false, bufferTextAllowed);
                            jQuery('#maxContentPost').text(1000 - t.length);
                            alert('You have reached the character limit for this annotation (max 1000 characters). Your pasted text was trimmed to meet the 1000 character limit.')
                        }, 10)
                    }

                },
                onKeyup: function(e) {
                    var t = e.currentTarget.innerText;
                    jQuery('#maxContentPost').text(1000 - t.trim().length);
                },
            }
        }, options);
        this.init();
        this.instanceID = instanceID;
        this.jq_backup = jQuery;
        this.last_delete = undefined;
        this.last_added = undefined;
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
        this.annotationListeners();
    };

    /**
     * 
     * @param element {HTMLElement} - where the annotation will be added
     * @param selector {String} - selector to find input it is replacing
     */
    $.Reply.prototype.addWYSIWYG = function(element, selector) {
        var self = this;
        if (self.elementObj != undefined) {
            return;
        }
        // adds the summernote WYSIWIG to the editor to the selector's location
        self.elementObj = self.jq_backup(element).find(selector);
        var newOptions = jQuery.extend({}, self.options, {'width': element.outerWidth()-24});
        self.elementObj.summernote(newOptions);

        // removes summernote's ability to tab within the editor so users can tab through items
        delete jQuery.summernote.options.keyMap.pc.TAB;
        delete jQuery.summernote.options.keyMap.mac.TAB;
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
    $.Reply.prototype.returnValue = function() {
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
    $.Reply.prototype.destroy = function(element, selector) {
        jQuery('.summernote').each(function() {
            jQuery(this).summernote('destroy');
        });
        if (this.elementObj) {
            this.elementObj.val('');
            this.elementObj.summernote('destroy');
            this.elementObj = undefined;
        }
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.Reply.prototype.annotationListeners = function() {
        var self = this;

        $.subscribeEvent('displayHidden', self.instanceID, function() {
            self.destroy();
        });

        $.subscribeEvent('addReplyToViewer', self.instanceID, function(_, viewer, reply, prefix, annotation) {
            if (self.last_added != reply.id) {
                setTimeout(self.addReplyToViewer(viewer, reply, prefix, annotation), 500);
            }
        });

        $.subscribeEvent('removeReply', self.instanceID, function(_, reply) {
            // console.log(reply);
            if ((reply.media === "Annotation" || reply.media === "comment") && self.last_delete != reply.id) {
                $.publishEvent('GetSpecificAnnotationData', self.instance_id, [reply.ranges[0].source, function(annotation_data) {
                    // console.log(annotation_data);
                    // console.log(reply)
                    annotation_data.totalReplies--;
                    annotation_data._local.highlights.forEach(function(high) {
                        jQuery(high).data('annotation', annotation_data);
                    });
                    jQuery('.reply-area-'+annotation_data.id+' .view-replies').html('View ' + annotation_data.totalReplies + ' Replies');
                }]);
            }
        });
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
                if (typeof(annotation.id) === "undefined") {
                    $.publishEvent('convertToEndpoint', self.instanceID, [annotation, function(ann) {
                        var ann_display = viewer.find('.item-'+ann.id);
                        self.annotationShown(viewer.find('.item-'+ann.id), ann, false);
                    }.bind(self)]);
                } else {
                    var ann_display = viewer.find('.item-'+annotation.id);
                    self.annotationShown(viewer.find('.item-'+annotation.id), annotation, false);
                }
                
            });
        } else {
            self.annotationShown(viewer, annotations, true);
        }
    };

    $.Reply.prototype.annotationShown = function(viewer, annotation,isSidebar) {
        var self = this;
        var prefix = isSidebar ? "sidebar-" : "other-";
        
        jQuery(viewer).find('.plugin-area-bottom').append('<div style="display: none;" class="reply-menu reply-menu-' + annotation.id + '"><button aria-label="Close Reply List" title="Close Reply List" class="close-list-reply"><span class="fa fa-times-circle"></span></button><button aria-label="Toggle Visual Order of Replies" title="Reverse Replies Order" class="sort-list-reply"><span class="fa fa-sort"></span></button></div><div class="reply-area-'+annotation.id+'"><button class="view-replies" style="display:none;" id="' + prefix + 'replies-'+annotation.id+'">View ' + self.pluralize(annotation.totalReplies, 'Reply', 'Replies') + '</button><div class="'+prefix+'reply-list" style="display:none;"></div><div class="create-reply-area" id="' + prefix + 'create-reply-area-'+annotation.id+'" style="display:none;"><textarea id="' + prefix + 'reply-textarea-'+annotation.id+'"></textarea><button id="' + prefix + 'save-reply-'+annotation.id+'">Save</button><button id="' + prefix + 'cancel-reply-'+annotation.id+'">Cancel</button></div><button class="create-reply" id="' + prefix + 'reply-'+annotation.id+'">Reply to Annotation</button></div>');
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
            if (jQuery(result).text().length === 0){
                alert('replies must contain text');
                return;
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
            // console.log("Reaching here", reply)
            $.publishEvent('StorageAnnotationSave', self.instanceID, [reply, false]);
            annotation.totalReplies++;
            (typeof(annotation.replies) == "undefined")  ? annotation.replies = [reply] : annotation.replies.push(reply);
            if (annotation._local && annotation._local.highlighter) {
                annotation._local.highlights.forEach(function(high) {
                    jQuery(high).data('annotation', annotation);
                });
            }
            self.last_added = reply.id;
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
                jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
            } else {
                if (jQuery('.ann-item.item-'+annotation.id+' .create-reply').length === 2) {
                    jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));
                    jQuery('.floating.ann-item.item-'+annotation.id+' .create-reply').hide();
                    jQuery('.floating.ann-item.item-'+annotation.id+' .view-replies').show();
                    jQuery('.floating.ann-item.item-'+annotation.id).find('.plugin-area-bottom div[class*=reply-list]').hide();
                    jQuery('.floating.ann-item.item-'+annotation.id).find('.plugin-area-bottom .reply-menu').hide();
                }
                jQuery('.side.ann-item.item-'+annotation.id+' .view-replies').html('View '+self.pluralize(annotation.totalReplies, 'Reply', 'Replies'));

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
            'target_source': annotation.id,
            'media': 'Annotation'
        }, function(results, converter) {
            jQuery('.loading-obj').remove();
            results.rows.reverse().forEach(function(reply) {
                var rep = converter(reply);
                self.addReplyToViewer(viewer, rep, prefix, annotation);
                annotation.replies ? (annotation.replies.push(rep)) : (annotation.replies = [rep])
            });
            if (annotation.totalReplies !== results.rows.length) {
                annotation.totalReplies = results.rows.length;
            }
            if (annotation._local && annotation._local.highlighter) {
                annotation._local.highlights.forEach(function(high) {
                    jQuery(high).data('annotation', annotation);
                });
            }
        }, function() {
            // console.log("Didn't work exactly");
        }])
    };

    $.Reply.prototype.addReplyToViewer = function(viewer, reply, prefix, annotation) {
        var self = this;
        var delete_option = '';
        var display_name = reply.creator.name;
        // console.log("DID IN FACT REACH HERE")
        if (self.options.instructors.indexOf(reply.creator.id) > -1) {
            delete_option = "<button aria-label='delete reply' title='Delete Reply' class='delete-reply' tabindex='0'><span class='fa fa-trash'></span></button>";
            display_name = self.options.common_instructor_name;
        }
        if (reply.creator.id === self.options.user_id) {
            delete_option = "<button aria-label='delete reply' title='Delete Reply' class='delete-reply' tabindex='0'><span class='fa fa-trash'></span></button>";
        }

        var reply_list = jQuery(viewer).find('.plugin-area-bottom div[class*=reply-list]');
        setTimeout(function() {
            if (reply_list.is(':visible')) {
                // console.log("Is visible");
                if (reply_list.find('.reply-item-' + reply.id).length > 0) {
                    // console.log("List has items");
                    reply_list.find('.reply-item-' + reply.id + ' .reply-body').html(reply.annotationText.join('<br>'));
                } else {
                    // console.log("List is empty");
                    jQuery('.reply-area-'+annotation.id+' .view-replies').html('View ' + annotation.totalReplies + ' Replies');
                    reply_list.append("<div class='reply reply-item-" + reply.id + "'>"+delete_option+"<strong>" + reply.creator.name + "</strong> ("+jQuery.timeago(reply.created)+"):" + reply.annotationText.join('<br><br>') + "</div>");
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
                                self.last_delete = reply.id;
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
                }
            } else {
                // console.log("not visible");
                jQuery('.reply-area-'+annotation.id+' .view-replies').html('View ' + annotation.totalReplies + ' Replies');
                setTimeout(function () {
                    if (!reply_list.is(':visible')) {
                        if (('totalReplies' in annotation) && annotation.totalReplies > 0) {
                            jQuery(viewer).find('.reply-area-' + annotation.id + " .view-replies").show();
                            jQuery(viewer).find('.reply-area-' + annotation.id + " .create-reply").hide();
                        }
                    }
                }, 500)
                
            }
        }, 500);
    };

    $.Reply.prototype.pluralize = function(num, singular, plural) {
        return num == 1 ? ('1 ' + singular) : (num + ' ' + plural);
    };

    Object.defineProperty($.Reply, 'name', {
        value: "Reply"
    });


    $.plugins.push($.Reply);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
