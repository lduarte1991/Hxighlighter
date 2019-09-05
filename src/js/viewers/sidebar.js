/**
 * 
 */
 var annotator = annotator ? annotator : require('annotator');

import './css/sidebar.css';
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'
import 'timeago';
require('jquery-tokeninput/styles/token-input-facebook.css');
require('jquery-tokeninput/build/jquery.tokeninput.min.js');

 (function($) {
    $.Sidebar = function(options, inst_id) {
        // sets default options
        var defaultOptions = {
            // set up template names that will be pulled
            TEMPLATENAMES: [
                "editor",
                "viewer",
            ],
            TEMPLATES: {
                editor: require('./templates/editor-sidebar.html'),
                viewer: require('./templates/viewer-sidebar.html'),
                annotationSection: require('./templates/annotationSection-multi-sidebar.html'),
                annotationItem: require('./templates/annotationItem-sidebar.html'),
            },
            template_suffix: "sidebar",
            template_urls: ""
        };
        this.options = jQuery.extend({}, defaultOptions, options);
        this.instance_id = inst_id;
        this.annotation_tool = {
            interactionPoint: null,
            editing: false,
            updating: false,
            editor: null,
            viewer: null
        };
        this.element = jQuery(this.options.element);
        this.hideTimer = null;
        this.load_more_open = false;
        if (options && options.viewer_options && options.viewer_options.defaultTab) {
            this.latestOpenedTabs = [options.viewer_options.defaultTab];
        } else {
            this.latestOpenedTabs = [];
        }
        this.init();
    };

    $.Sidebar.prototype.init = function() {
        var self = this;
        self.setUpTemplates(self.options.template_suffix);
        self.setUpSidebar();
        self.setUpListeners();
    };

    $.Sidebar.prototype.setUpTemplates = function(suffix) {
        var self = this;
        var deferreds = jQuery.map(self.options.TEMPLATENAMES, function (templateName){
            if (templateName in self.options.TEMPLATES) {
                return;
            }
            var options = {
                url: self.options.template_urls + templateName + '-' + suffix + '.html',
                type: "GET",
                contentType:"charset=utf-8",
                success: function (data) {
                    var template = _.template(data);
                    self.options.TEMPLATES[templateName] = template;
                },
                async: true
            };
            return jQuery.ajax(options);
        });

        jQuery.when.apply(jQuery, deferreds).done(function(){
            self.annotation_tool.editorTemplate = self.options.TEMPLATES.editor({
                editorid: self.instance_id.replace(/:/g, '-')
            });
        });
    };

    $.Sidebar.prototype.setUpSidebar = function() {
        var self = this;
        var sidebarOptions = jQuery.extend({
            'tabsAvailable': ['search', 'mine', 'instructor', 'peer'],
        }, self.options.viewer_options, {annotationItems: []});
        self.element.append(self.options.TEMPLATES.annotationSection(sidebarOptions));


        self.sidebar = self.element.find('.annotationSection');
        self.sidebar.parent().css('width', 'calc(100% - var(--sidebar-width))');

        // self.element.on('mouseover', '.annotationsHolder', function(event) {
        //     jQuery('body').css('overflow-y', 'hidden');
        // });

        // self.element.on('mouseleave', '.annotationsHolder', function(event) {
        //     jQuery('body').css('overflow-y', 'scroll');
        // });

        // toggle search
        jQuery('#search').click(function() {
            jQuery('.search-bar.search-toggle').toggle();
            jQuery('.annotationsHolder').toggleClass('search-opened');

            $.publishEvent('StorageAnnotationLoad', self.instance_id, [[], function(a){return a;}, true]);
        });
        jQuery('#sidebar-filter-options').click(function(){
            jQuery('.annotationsHolder').removeClass('search-opened');
            jQuery('.annotation-filter-buttons').show();
            jQuery('#sidebar-filter-options').hide();
            jQuery('.search-bar.search-toggle').hide();
            jQuery('.tag-token-list').hide();
            var doit = self.latestOpenedTabs;
            self.latestOpenedTabs = [];
            jQuery.each(doit, function(_, tab) {
                console.log(tab);
                jQuery('#' + tab).trigger('click');
            });
            
            // jQuery('.annotationsHolder.side').html('');
            // var messageVals = [];
            // var pluralMessage = '';
            // jQuery.each(jQuery('.btn.user-filter'), function(a, b) {
            //     if (b.id == 'mynotes') {
            //         messageVals.push("your annotations")
            //     } else if (b.id == 'instructor') {
            //         messageVals.push("instructor annotations");
            //     } else if (b.id == 'public') {
            //         messageVals.push("peer annotations");
            //     }
            // })
            // if (messageVals.length > 1) {
            //     messageVals.splice(messageVals.length - 1, 0, 'and/or,')
            //     messageVals = messageVals.join(', ').replace(',,', '');
            //     pluralMessage = '<br><br>Note: You can select multiple tabs at a time to view those annotations together!</div>'
            // }
            // jQuery('.side.annotationsHolder').append('<div id="empty-alert" style="padding:20px;text-align:center;"><strong>No Annotations Selected</strong><br>Use the filter buttons above to view ' + messageVals + '.' + pluralMessage)

            return;
        });

        jQuery('#search-clear').click(function() {
            jQuery('#srch-term').val('');
            $.publishEvent('StorageAnnotationSearch', self.instance_id, [{
                type: self.options.mediaType,
            }, function(results, converter) {
                $.publishEvent('StorageAnnotationLoad', self.instance_id, [results.rows.reverse(), converter, true]);
            }, function() {

            }])
        });

        jQuery('#srch-term').on('keydown', function(event) {
            if (event.key == "Enter") {
                jQuery('#search-submit').trigger('click');
            }
        });

        jQuery('#search-submit').click(function() {
            var searchValue = jQuery('#srch-term').val().trim();
            var searchType = jQuery('.search-bar select').val();
            var ops = self.filterByType(searchValue, searchType, undefined);
            self.search(ops);
        });

        // trigger new filter tab
        jQuery('.btn.user-filter').click(function() {
            if (this.id === "search") {
                jQuery('.btn.user-filter').removeClass('active');
                jQuery('.btn.user-filter').find('.fas.fa-toggle-on').addClass('fa-flip-horizontal');//.removeClass('fa-toggle-on').addClass('fa-toggle-off');
            } else {
                if (jQuery(this).hasClass('active')) {
                    self.latestOpenedTabs.splice(self.latestOpenedTabs.indexOf(this.id), 1);
                    if (jQuery('.btn.user-filter.active').length == 1) {
                        jQuery(this).removeClass('active');
                        
                        jQuery(this).find('.fas.fa-toggle-on').addClass('fa-flip-horizontal');
                        jQuery(this).attr('aria-pressed', 'false');
                        $.publishEvent('StorageAnnotationLoad', self.instance_id, [[], function(a){return a}, true]);
                        jQuery('.annotationsHolder.side').html('');
                        var messageVals = [];
                        var pluralMessage = '';
                        jQuery.each(jQuery('.btn.user-filter'), function(a, b) {
                            if (b.id == 'mine') {
                                messageVals.push("your annotations")
                            } else if (b.id == 'instructor') {
                                messageVals.push("instructor annotations");
                            } else if (b.id == 'peer') {
                                messageVals.push("peer annotations");
                            }
                        })
                        if (messageVals.length > 1) {
                            messageVals.splice(messageVals.length - 1, 0, 'and/or,')
                            messageVals = messageVals.join(', ').replace(',,', '');
                            pluralMessage = '<br><br>Note: You can select multiple tabs at a time to view those annotations together!</div>'
                        }
                        jQuery('.side.annotationsHolder').append('<div id="empty-alert" style="padding:20px;text-align:center;"><strong>No Annotations Selected</strong><br>Use the filter buttons above to view ' + messageVals + '.' + pluralMessage)

                        return;
                    }
                    jQuery(this).removeClass('active');
                    jQuery(this).attr('aria-pressed', 'false');
                    jQuery(this).find('.fas.fa-toggle-on').addClass('fa-flip-horizontal');//removeClass('fa-toggle-on').addClass('fa-toggle-off');
                } else {
                    jQuery(this).addClass('active');
                    jQuery(this).attr('aria-pressed', 'true');
                    self.latestOpenedTabs.push(this.id);
                    jQuery(this).find('.fas.fa-toggle-on').removeClass('fa-flip-horizontal');//.removeClass('fa-toggle-off').addClass('fa-toggle-on');
                }
            }
            jQuery('.annotationsHolder').removeClass('search-opened');
                jQuery('.search-bar.search-toggle').hide();
            var search_options = {
                type: self.media
            }
            
            var filteroptions = jQuery('.btn.user-filter.active').toArray().map(function(button){return button.id});

            if (this.id === "search") {
                jQuery('.annotationsHolder').addClass('search-opened');
                jQuery('.annotation-filter-buttons').hide();
                jQuery('#sidebar-filter-options').show();
                jQuery('.search-bar.search-toggle').show();
                jQuery('.tag-token-list').show();
                jQuery('.annotationsHolder.side').html('');
                jQuery('.side.annotationsHolder').append('<div id="empty-alert" style="padding:20px;text-align:center;">Search annotations with options above.</div>');
                return;
            }

            var possible_exclude = [];
            var possible_include = [];
            //console.log(filteroptions);
            if (filteroptions.indexOf('mine') > -1 ) {
                possible_include.push(self.options.user_id);
            } else {
                possible_exclude.push(self.options.user_id);
            }
            if(filteroptions.indexOf('instructor') > -1 ) {
                possible_include = possible_include.concat(self.options.instructors);
            } else {
                possible_exclude = possible_exclude.concat(self.options.instructors);
            }
            if (filteroptions.indexOf('peer') > -1) {
                if (possible_exclude.length > 0) {
                    search_options['exclude_userid'] = possible_exclude
                }
            } else {
                search_options['userid'] = possible_include;
            }

            if (self.options.instructors.indexOf(self.options.user_id) > -1) {
                if (filteroptions.indexOf('peer') > -1 && ((filteroptions.indexOf('mine') > -1 && filteroptions.indexOf('instructor') == -1) || (filteroptions.indexOf('mine') == -1 && filteroptions.indexOf('instructor') > -1))) {
                    // jQuery('.btn.user-filter#instructor').addClass('active');
                    // jQuery('.btn.user-filter#instructor').find('.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on');
                    // jQuery('.btn.user-filter#mynotes').addClass('active');
                    // jQuery('.btn.user-filter#mynotes').find('.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on');
                    search_options['exclude_userid'] = [];
                    //search_options['userid'] = [];
                }
            }

            self.search(search_options)
        });

        jQuery('.sidebar-button#hide_label').click(function() {
            jQuery(':root').css('--sidebar-width', '0px');
            jQuery('.annotationSection').hide();

            self.showSidebarTab(self.options.viewer_options.sidebarversion);
        });
        jQuery('.side.annotationsHolder').on('scroll', function() {
            if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight) {
                var total_left = $.totalAnnotations - jQuery('.side.ann-item').length;
                if (total_left > 0 && jQuery('.load-more').length == 0) {
                    jQuery('.side.annotationsHolder').css('padding-bottom', '40px');
                    jQuery('.side.annotationsHolder').after('<div role="button" tabindex="0" class="load-more side make-jiggle">Load Next ' + self.options.viewer_options.pagination + ' Annotations</div>');
                    self.load_more_open = true;
                    jQuery('.side.load-more').click(function() {
                        var options = {
                            type: self.options.mediaType,
                            limit: self.options.viewer_options.pagination,
                            offset: jQuery('.side.ann-item').length
                        }

                        if (jQuery('.search-toggle:visible').length > 0) {
                            var searchValue = jQuery('#srch-term').val().trim();
                            var searchType = jQuery('.search-bar select').val();
                            options = self.filterByType(searchValue, searchType, options);
                        } else {
                            var possible_exclude = [];
                            var possible_include = [];
                            var filteroptions = jQuery('.btn.user-filter.active').toArray().map(function(button){return button.id});
                            if (filteroptions.indexOf('mine') > -1 ) {
                                possible_include.push(self.options.user_id);
                            } else {
                                possible_exclude.push(self.options.user_id);
                            }
                            if(filteroptions.indexOf('instructor') > -1 ) {
                                possible_include = possible_include.concat(self.options.instructors);
                            } else {
                                possible_exclude = possible_exclude.concat(self.options.instructors);
                            }
                            if (filteroptions.indexOf('peer') > -1) {
                                if (possible_exclude.length > 0) {
                                    options['exclude_userid'] = possible_exclude
                                }
                            } else {
                                options['userid'] = possible_include;
                            }
                        }

                        jQuery(this).html('<span class="fa fa-spinner make-spin"></span>');
                        //console.log(options);
                        $.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(results, converter) {
                            jQuery('.side.load-more').remove();
                            jQuery('.side.annotationsHolder').css('padding-bottom', '0px');
                            $.publishEvent('StorageAnnotationLoad', self.instance_id, [results.rows, converter, false]);
                        }, function() {
                            
                        }]);

                    });
                }
            } else if(self.load_more_open && jQuery(this).scrollTop() + jQuery(this).innerHeight() <= jQuery(this)[0].scrollHeight - 50) {
                //console.log('should remove it');
                self.load_more_open = false;
                jQuery('.side.load-more').remove();
                jQuery('.side.annotationsHolder').css('padding-bottom', '0px');
            }
        });
    };

    $.Sidebar.prototype.showSidebarTab = function(type) {
        // if (type === "smalltab") {
            jQuery(':root').css('--sidebar-width', '55px');
            jQuery('.resize-handle.side').append('<div class="'+type+' open-sidebar" tabindex="0" role="button" id="sidebaropen" aria-pressed="false" aria-label="Toggle sidebar" title="Toggle Sidebar"><span class="fas fa-comments"></span></div>');
        // }

        jQuery('.open-sidebar').click(function() {
            jQuery('.open-sidebar').remove();
            jQuery('.annotationSection').show();
            jQuery(':root').css('--sidebar-width', '300px');
        });
    };

    $.Sidebar.prototype.setUpListeners = function() {
        var self = this;

        $.subscribeEvent('StorageAnnotationSave', self.instance_id, function(_, annotation, updating) {
            console.log("reached here!");
            var filteroptions = jQuery('.btn.user-filter.active').toArray().map(function(button){return button.id});
            if (filteroptions.indexOf('mine') > -1 ) {
                self.addAnnotation(annotation, updating, false);
            } else {
                jQuery('.sr-real-alert').html('Your annotation was saved but the annotation list is not currently showing your annotations. Toggle "Mine" button to view your annotation.');
                $.publishEvent('increaseBadgeCount', self.instance_id, [jQuery('#mine')]);
            }
        });

        $.subscribeEvent('StorageAnnotationDelete', self.instance_id, function(_, annotation, updating) {
            jQuery('.item-' + annotation.id).remove();
            if (jQuery('.annotationItem').length == 0) {
                jQuery('#empty-alert').css('display', 'block');
            } 
        });

        $.subscribeEvent('searchTag', self.instance_id, function(_, tag) {
            var options = {
                'type': self.options.mediaType,
                'tag': tag
            };
            self.search(options);
        });

        $.subscribeEvent('annotationLoaded', self.instance_id, function(_, annotation) {
            self.addAnnotation(annotation, false, true);
        });

        $.subscribeEvent('autosearch', self.instance_id, function(_, term, type) {
            self.autosearch(term, type);
        })
    };

    $.Sidebar.prototype.addAnnotation = function(annotation, updating, shouldAppend) {
        var self = this;
        if (annotation.media !== "comment" && annotation.text !== "" && $.exists(annotation.tags)) {
            var ann = annotation;
            ann.index = jQuery('.ann-item').length;
            ann.instructor_ids = self.options.instructors;
            ann.common_name = (self.options.common_instructor_name && self.options.common_instructor_name !== "") ? self.options.common_instructor_name : ann.creator.name;
            var annHTML = self.options.TEMPLATES.annotationItem(ann);
            if (self.options.viewer_options.readonly) {
                annHTML = annHTML.replace(/<button class="edit".*?<\/button>/g, '').replace(/<button class="delete".*?<\/button>/g, '')
            }
            if (jQuery('.side.item-' + ann.id).length > 0) {
                jQuery('.item-' + ann.id).html(jQuery(annHTML).html());
            }  else {
                if (shouldAppend) {
                    jQuery('.annotationsHolder').append(annHTML);
                } else {
                    jQuery('.annotationsHolder').prepend(annHTML);
                }
                
            }
            jQuery('.item-' + ann.id).find('.delete').confirm({
                title: 'Delete Annotation?',
                content: 'Would you like to delete your annotation? This is permanent.',
                buttons: {
                    confirm: function() {
                        $.publishEvent('StorageAnnotationDelete', self.instance_id, [annotation]);
                    },
                    cancel: function () {
                    }
                }
            });
            jQuery('.side.item-' + ann.id).find('.edit').click(function(event) {
                self.ViewerEditorOpen(event, ann, true);
            });

            jQuery('.side.item-' + ann.id).click(function() {
                if (ann._local && ann._local.highlights && ann._local.highlights.length > 0) {
                    var nav_offset = getComputedStyle(document.body).getPropertyValue('--nav-bar-offset');
                    jQuery(self.element).parent().animate({scrollTop: (jQuery(ann._local.highlights[0]).offset().top + jQuery(self.element).parent().scrollTop() - parseInt(nav_offset, 10) - 40)});
                    //jQuery(ann._local.highlights).animate({'outline': '2px solid black'}, 1000)
                    setTimeout(function() {
                        ann._local.highlights.forEach(function(hl) {
                            if (jQuery(hl).text().trim().length > 0) {
                                jQuery(hl).css({border: '0 solid black'}).animate({borderWidth: 2}, 200).animate({borderWidth: 0}, 200);
                            }
                        });
                        jQuery('#first-node-' + ann.id)[0].focus();
                        $.publishEvent('focusOnContext', self.instance_id, [ann]);
                    }, 350);
                }
            });

            jQuery('.side.item-' + ann.id).find('.annotatedBy.side').click(function(e) {
                self.autosearch(jQuery(this).text().trim(), 'User')
                $.pauseEvent(e);
            });

            jQuery('.side.item-' + ann.id).find('.annotation-tag.side').click(function(e) {
                self.autosearch(jQuery(this).text().trim(), 'Tag');
                // jQuery('.btn.user-filter').removeClass('active');
                // jQuery('.btn.user-filter').find('.fas.fa-toggle-on').addClass('fa-flip-horizontal');//.removeClass('fa-toggle-on').addClass('fa-toggle-off');
                // jQuery('.annotationsHolder').addClass('search-opened');
                // jQuery('.annotation-filter-buttons').hide();
                // jQuery('#sidebar-filter-options').show();
                // jQuery('.search-bar.search-toggle').show();
                // jQuery('.tag-token-list').show();
                // jQuery('.search-toggle').show(jQuery(this).html().trim());
                // var options = {
                //     type: self.options.mediaType,
                // }
                // var tagSearched = jQuery(this).html().trim();
                // options['tag'] = tagSearched;
                // jQuery('#srch-term').val(tagSearched)
                // jQuery('.search-bar select').val('Tag');
                // self.search(options);
                $.pauseEvent(e);
            });

            $.publishEvent('displayShown', self.instance_id, [jQuery('.item-' + ann.id), ann]);
            jQuery('#empty-alert').css('display', 'none');
        }
    };

    $.Sidebar.prototype.filterByType= function(searchValue, type, options) {
        var self = this;
        searchValue = searchValue.trim();
        var options = options ? options : { 'type': self.options.mediaType }
        if (searchValue === "") {
            jQuery('.annotationsHolder .annotationItem').show();
            return;
        }
        if (type === "User") {
            options['username'] = searchValue;
        } else if (type === "Annotation") {
            options['text'] = searchValue;
        } else if (type === "Tag") {
            options['tag'] = searchValue;
        }
        return options;
    };

    $.Sidebar.prototype.search = function(options) {
        jQuery('.annotationsHolder').prepend('<div class="loading-obj" style="margin-top: 15px; text-align: center"><span class="make-spin fa fa-spinner"></span></div>');
        $.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(results, converter) {
            jQuery('.annotationsHolder.side').html('');
            $.publishEvent('StorageAnnotationLoad', self.instance_id, [results.rows, converter, true]);
            jQuery('.loading-obj').remove();
            jQuery('.side.annotationsHolder').scrollTop(0);
            self.load_more_open = false;
            jQuery('.side.load-more').remove();
            jQuery('.side.annotationsHolder').css('padding-bottom', '0px');
            if (results.rows.length == 0) {
                jQuery('.side.annotationsHolder').append('<div id="empty-alert" style="padding:20px;text-align:center;">No annotations to show! Create an annotation by highlighting a portion of the text to the right.</div>');
            }
        }, function(err) {
            jQuery('.loading-obj').remove();
            if (jQuery('.ann-item').length == 0) {
                jQuery('#empty-alert').remove();
                jQuery('.side.annotationsHolder').append('<div id="empty-alert" style="padding:20px;text-align:center;">No annotations to show! Create an annotation by highlighting a portion of the text to the right.</div>');
            }
        }]);
    }

    $.Sidebar.prototype.TargetSelectionMade = function(annotation, event) {
        var self = this;
        self.currentSelection = annotation;
    };

    $.Sidebar.prototype.TargetAnnotationDraw = function(annotation) {

    };

    $.Sidebar.prototype.ViewerEditorOpen = function(event, annotation, updating, interactionPoint) {
        var self = this;
        var editor = jQuery('.side.item-' + annotation.id);
        editor.find('.body').after('<div class="editor-area side"><textarea id="annotation-text-field")></textarea><div class="plugin-area"></div><button tabindex="0" class="btn btn-primary save action-button">Save</button><button tabindex="0" class="btn btn-default cancel action-button">Cancel</button></div>');
        editor.find('.body').hide();
        editor.find('.tagList').hide();
        jQuery('.edit').prop('disabled', true);

        // closes the editor tool and does not save annotation
        editor.find('.cancel').click(function () {
            self.ViewerEditorClose(annotation, true, false, editor);
        });

        // closes the editor and does save annotations
        editor.find('.save').click(function () {
            var text = editor.find('#annotation-text-field').val();
            if (updating) {
                annotation.annotationText.pop();
            }
            annotation.annotationText.push(text);
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, false, false]);
            self.ViewerEditorClose(annotation, true, false, editor);
        });

        $.publishEvent('editorShown', self.instance_id, [editor, annotation]);
    };

    $.Sidebar.prototype.ViewerEditorClose = function(annotation, redraw, should_erase, editor) {
      jQuery('.editor-area.side').remove();
      jQuery('.edit').prop('disabled', false);
      jQuery('.note-link-popover').remove();
      $.publishEvent('editorHidden', self.instance_id, []);
      if (editor) {
         editor.find('.side.body').show();
         editor.find('.tagList.side').show();
      }
    };

    $.Sidebar.prototype.ViewerDisplayOpen = function(event, annotations) {
        
    };

    $.Sidebar.prototype.ViewerDisplayClose = function(annotations) {

    };

    $.Sidebar.prototype.StorageAnnotationSave = function(annotations) {

    };
    
    $.Sidebar.prototype.StorageAnnotationDelete = function(annotations) {

    };

    $.Sidebar.prototype.StorageAnnotationLoad = function(annotations) {
    };

    $.Sidebar.prototype.autosearch = function(term, type) {
        var self = this;
        if (self.options.viewer_options.readonly) {
            $.publishEvent('dumpStore', self.instance_id, [function(annotations) {
                self.tempAnnotationList = annotations;
                jQuery('.ann-item').show();
                $.publishEvent('undrawAll', self.instance_id, [function(annList) {
                    self.foundList = [];
                    self.tempAnnotationList.forEach(function(ann) {
                        if (type == "Tag") {
                            if(ann.tags.indexOf(term) > -1) {
                               self.foundList.push(ann);
                            } else {
                                jQuery('.ann-item.item-' + ann.id).hide();
                            }
                        } else if (type == "User") {
                            if(ann.creator.name === term) {
                                self.foundList.push(ann);
                            } else {
                                jQuery('.ann-item.item-' + ann.id).hide();
                            }
                        }
                    });
                    $.publishEvent('drawList', self.instance_id, [self.foundList, function() {
                        jQuery('#empty-alert').html('You are now viewing only annotations with ' + type.toLowerCase() + ' "' + term + '". Click here to view all annotations');
                        jQuery('#empty-alert').show();
                        jQuery('#empty-alert').css('cursor', 'pointer');
                        
                        jQuery('#empty-alert').on('click', function() {
                            jQuery('#empty-alert').off('click');
                            jQuery('#empty-alert').hide();
                            jQuery('#empty-alert').css('cursor', 'default');
                            jQuery('.ann-item').show();
                            $.publishEvent('undrawAll', self.instance_id, [function(annList){
                                $.publishEvent('drawList', self.instance_id, [self.tempAnnotationList, function(){}])
                            }]);
                        });
                    }]);
                }]);
            }]);
                
        } else {
            jQuery('.btn.user-filter').removeClass('active');
            jQuery('.btn.user-filter').find('.fas.fa-toggle-on').addClass('fa-flip-horizontal');//.removeClass('fa-toggle-on').addClass('fa-toggle-off');
            if (term !== self.options.common_instructor_name) {
                self.search(self.filterByType(term, type, undefined));
                jQuery('.annotationsHolder').addClass('search-opened');
                jQuery('.search-toggle').show();
                jQuery('.annotation-filter-buttons').hide();
                jQuery('#sidebar-filter-options').show();
                jQuery('.search-bar.search-toggle').show();
                jQuery('.tag-token-list').show();
                $.publishEvent('searchSelected', self.instance_id, []);
                jQuery('#srch-term').val(term)
                jQuery('.search-bar select').val(type);
            } else {
                jQuery('#sidebar-filter-options').trigger('click');
                jQuery('.btn.user-filter#instructor').trigger('click');
            }
        }
    };

    $.viewers.push($.Sidebar);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
