/**
 * 
 */
 var annotator = annotator ? annotator : require('annotator');

import './css/sidebar.css';
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'
import 'timeago';

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
                annotationSection: require('./templates/annotationSection-sidebar.html'),
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
            'tabsAvailable': ['search', 'mine', 'instructor', 'all'],
        }, self.options.viewer_options, {annotationItems: []});
        self.element.append(self.options.TEMPLATES.annotationSection(sidebarOptions));

        self.sidebar = self.element.find('.annotationSection');
        self.sidebar.parent().css('width', 'calc(100% - var(--sidebar-width))');

        self.element.on('mouseover', '.annotationsHolder', function(event) {
            jQuery('body').css('overflow', 'hidden');
        });

        self.element.on('mouseleave', '.annotationsHolder', function(event) {
            jQuery('body').css('overflow', 'inherit');
        });

        // toggle search
        jQuery('#search').click(function() {
            jQuery('.search-bar.search-toggle').toggle();
            jQuery('.annotationsHolder').toggleClass('search-opened');
        });

        jQuery('#search-clear').click(function() {
            jQuery('#srch-term').val('');
            $.publishEvent('StorageAnnotationSearch', self.instance_id, [{
                type: self.options.mediaType,
            }, function(results, converter) {
                console.log(results.rows);
                $.publishEvent('StorageAnnotationLoad', self.instance_id, [results.rows.reverse(), converter]);
            }])
        });

        jQuery('#search-submit').click(function() {
            var searchValue = jQuery('#srch-term').val().trim();
            var searchType = jQuery('.search-bar select').val();
            console.log(searchValue, searchType);
            self.filterByType(searchValue, searchType);
        });

        // trigger new filter tab
        jQuery('.btn.user-filter').click(function() {
            jQuery('.btn.user-filter').removeClass('active');
            jQuery(this).addClass('active');
            jQuery('.annotationsHolder').removeClass('search-opened');
                jQuery('.search-bar.search-toggle').hide();
            var search_options = {
                type: self.media
            }
            if (this.id === "search") {
                jQuery('.annotationsHolder').addClass('search-opened');
                jQuery('.search-bar.search-toggle').show();
                return;
            } else if(this.id === 'mynotes') {
                search_options['username'] = self.options.username;
            } else if (this.id === "instructor") {
                search_options['username'] = self.options.instructors;
            }
            self.search(search_options)
        });

        jQuery('.sidebar-button#hide_label').click(function() {
            jQuery(':root').css('--sidebar-width', '0px');
            jQuery('.annotationSection').hide();

            self.showSidebarTab(self.options.viewer_options.sidebarversion);
        });
    };

    $.Sidebar.prototype.showSidebarTab = function(type) {
        // if (type === "smalltab") {
            jQuery(':root').css('--sidebar-width', '55px');
            jQuery('.resize-handle.side').append('<div class="'+type+' open-sidebar"><i class="fa fa-arrow-right"></i></div>');
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
            self.addAnnotation(annotation, updating);
        });

        $.subscribeEvent('StorageAnnotationDelete', self.instance_id, function(_, annotation, updating) {
            jQuery('.item-' + annotation.id).remove();
            if (jQuery('.annotationItem').length == 0) {
                jQuery('#empty-alert').css('display', 'block');
            } 
        });

        $.subscribeEvent('annotationLoaded', self.instance_id, function(_, annotation) {
            self.addAnnotation(annotation, false);
        });
    };

    $.Sidebar.prototype.addAnnotation = function(annotation, updating) {
        var self = this;
        if (annotation.media !== "comment" && annotation.text !== "" && $.exists(annotation.tags)) {
            var ann = jQuery.extend({}, annotation, {'index': 0});
            var annHTML = self.options.TEMPLATES.annotationItem(ann)
            if (jQuery('.side.item-' + ann.id).length > 0) {
                jQuery('.item-' + ann.id).html(jQuery(annHTML).html());
            }  else {
                jQuery('.annotationsHolder').prepend(annHTML);
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
            jQuery('.side.item-' + ann.id).find('.edit').click(function() {
                self.ViewerEditorOpen(ann, true);
            });

            $.publishEvent('displayShown', self.instance_id, [jQuery('.item-' + ann.id), ann]);
            jQuery('#empty-alert').css('display', 'none');
        }
    };

    $.Sidebar.prototype.filterByType= function(searchValue, type) {
        var self = this;
        searchValue = searchValue.trim();
        var options = {
            'type': self.options.mediaType
        }
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
        self.search(options);
    };

    $.Sidebar.prototype.search = function(options) {
        $.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(results, converter) {
            $.publishEvent('StorageAnnotationLoad', self.instance_id, [results.rows.reverse(), converter]);
        }]);
    }

    $.Sidebar.prototype.TargetSelectionMade = function(annotation, event) {
        var self = this;
        self.currentSelection = annotation;
    };

    $.Sidebar.prototype.TargetAnnotationDraw = function(annotation) {

    };

    $.Sidebar.prototype.ViewerEditorOpen = function(annotation, updating, interactionPoint) {
        var editor = jQuery('.side.item-' + annotation.id);
        console.log('should reach here', annotation, updating);
        editor.find('.body').after('<div class="editor-area side"><textarea id="annotation-text-field")></textarea><button tabindex="0" class="btn btn-primary save action-button">Save</button><button tabindex="0" class="btn btn-default cancel action-button">Cancel</button></div>');
        editor.find('.body').hide();

        // closes the editor tool and does not save annotation
        editor.find('.cancel').click(function () {
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, false, !updating]);
            self.ViewerEditorClose(annotation, true, false, editor);
        });

        // closes the editor and does save annotations
        editor.find('.save').click(function () {
            var text = self.annotation_tool.editor.find('#annotation-text-field').val();
            if (updating) {
                annotation.annotationText.pop();
            }
            annotation.annotationText.push(text);
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, updating, false]);
            self.ViewerEditorClose(annotation, true, false, editor);
        });

        $.publishEvent('editorShown', self.instance_id, [editor, annotation]);
    };

    $.Sidebar.prototype.ViewerEditorClose = function(annotation, redraw, should_erase, editor) {
      jQuery('.editor-area side').remove();
      if (editor) {
         editor.find('.body').show();
      }
    };

    $.Sidebar.prototype.ViewerDisplayOpen = function(annotations) {
        
    };

    $.Sidebar.prototype.ViewerDisplayClose = function(annotations) {

    };

    $.Sidebar.prototype.StorageAnnotationSave = function(annotations) {

    };
    
    $.Sidebar.prototype.StorageAnnotationDelete = function(annotations) {

    };

    $.Sidebar.prototype.StorageAnnotationLoad = function(annotations) {
            jQuery('.annotationsHolder.side').html('');
    };

    $.viewers.push($.Sidebar);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
