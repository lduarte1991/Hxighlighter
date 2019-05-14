/**
 * 
 */
 var annotator = annotator ? annotator : require('annotator');

import './css/sidebar.css';
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'

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
            'show_mynotes_tab': "True",
            'show_instructor_tab': "True",
            'show_public_tab': "True"
        }, self.options.sidebar_options, {annotationItems: []});
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
            jQuery('.annotationsHolder .annotationItem').show();
        });

        jQuery('#search-submit').click(function() {
            var searchValue = jQuery('#srch-term').val().trim();
            var searchType = jQuery('.search-bar select').val();
            self.filterByType(searchValue, searchType);
        });
    }

    $.Sidebar.prototype.setUpListeners = function() {
        var self = this;
        $.subscribeEvent('StorageAnnotationSave', self.instance_id, function(_, annotation, updating) {
            var ann = jQuery.extend({}, annotation, {'index': 0});
            var annHTML = self.options.TEMPLATES.annotationItem(ann)
            if (updating) {
                jQuery('.item-' + ann.id).html(jQuery(annHTML).html())
            }
            else {
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

            $.publishEvent('displayShown', self.instance_id, [jQuery('.item-' + ann.id), ann]);
            jQuery('#empty-alert').css('display', 'none');
        });

        $.subscribeEvent('StorageAnnotationDelete', self.instance_id, function(_, annotation, updating) {
            jQuery('.item-' + annotation.id).remove();
            if (jQuery('.annotation-item').length == 0) {
                jQuery('#empty-alert').css('display', 'block');
            } 
        });
    };

    $.Sidebar.prototype.filterByType= function(searchValue, type) {
        if (searchValue === "") {
            jQuery('.annotationsHolder .annotationItem').show();
            return;
        }
        if (type === "User") {
            jQuery.each(jQuery('.annotationsHolder .annotationItem'), function(_, item) {
                if (jQuery(item).find('.annotatedBy').html().trim().toLowerCase() !== searchValue.trim().toLowerCase()) {
                    jQuery(item).hide();
                } else {
                    jQuery(item).show();
                }
            });
        } else if (type === "Annotation") {
            jQuery.each(jQuery('.annotationsHolder .annotationItem'), function(_, item) {
                if (jQuery(item).find('.body').html().toLowerCase().indexOf(searchValue.trim().toLowerCase()) === -1) {
                    jQuery(item).hide();
                } else {
                    jQuery(item).show();
                }
            });
        } else if (type === "Tag") {
            jQuery.each(jQuery('.annotationsHolder .annotationItem'), function(_, item) {
                var tags = jQuery(item).find('.annotation-tag');
                if (tags.length === 0) {
                    jQuery(item).hide();
                } else {
                    var found = false;
                    jQuery.each(tags, function(_, tag) {
                        if (jQuery(tag).html().trim().toLowerCase().indexOf(searchValue.trim().toLowerCase()) > -1 && jQuery(tag).html().trim().length !== 0) {
                            found = true
                        }
                    });
                    found ? jQuery(item).show() : jQuery(item).hide();
                }
            });
        }
    };

    $.Sidebar.prototype.TargetSelectionMade = function(annotation, event) {
        var self = this;
        self.currentSelection = annotation;
    };

    $.Sidebar.prototype.ViewerEditorOpen = function(annotation, updating, interactionPoint) {
        
    };

    $.Sidebar.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {
      
    };

    $.Sidebar.prototype.ViewerDisplayOpen = function(annotations) {
        
    };

    $.Sidebar.prototype.ViewerDisplayClose = function(annotations) {

    };

    $.Sidebar.prototype.StorageAnnotationSave = function(annotations) {

    };
    
    $.Sidebar.prototype.StorageAnnotationDelete = function(annotations) {

    };

    $.viewers.push($.Sidebar);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
