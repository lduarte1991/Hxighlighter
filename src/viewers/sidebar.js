/**
 * 
 */

(function($) {
    $.Sidebar = function(options, inst_id) {
        // sets default options
        var defaultOptions = {
            // set up template names that will be pulled
            TEMPLATENAMES: [
                "editor",
                "viewer",
                "annotationSection"
            ],
            TEMPLATES: {},
            template_suffix: "side",
            template_urls: ""
        };
        this.options = jQuery.extend({}, defaultOptions, options);
        this.instance_id = inst_id;
        this.annotation_tool = {
            interactionPoint: null,
            editing: false,
            editor: null,
            viewer: null
        };
        this.init();
    };

    $.Sidebar.prototype.init = function() {
        var self = this;
        switch(self.options.mediaType) {
            case 'text':
                break;
            case 'image':
                break;
            case 'video':
                break;
        }
        self.setUpTemplates();
    };

    $.Sidebar.prototype.setUpTemplates = function () {
        var self = this;
        var deferreds = jQuery.map(self.options.TEMPLATENAMES, function (templateName){
            var options = {
                url: self.options.template_urls + templateName + '-' + self.options.template_suffix + '.html',
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

        jQuery.when.apply(jQuery, deferreds).done(function (){
            self.annotation_tool.editorTemplate = self.options.TEMPLATES.editor({
                editorid: self.instance_id.replace(/:/g, '-')
            });
            self.setUpListeners();
            
        });

    };

    $.Sidebar.prototype.setUpListeners = function() {
        var self = this;
        if (!self.element) {
            hxSubscribe('targetLoaded', self.instance_id, function(_, element) {
                self.element = element;
                self.setUpSidebar();
                
            });
        } else {
            self.setUpSidebar();
        }

        hxSubscribe('selectionMade', self.instance_id, function(_, element, ranges, event){
            if (self.annotation_tool.editing) {
                return;
            }

            var annotation = {
                annotationText: [],
                ranges: ranges,
                id: Hxighlighter.getUniqueId(),
                exact: getQuoteFromHighlights(ranges).exact,
                mediaType: self.options.mediaType
            };

            self.currentSelection = annotation;
        });



    };

    $.Sidebar.prototype.setUpSidebar = function() {
        var self = this;
        self.element.append(self.options.TEMPLATES.annotationSection({
            'show_mynotes_tab': "True",
            'show_instructor_tab': "True",
            'show_public_tab': "True",
            'annotationItems': []
        }));

        self.element.on('mouseover', '.annotationsHolder', function(event) {
            jQuery('body').css('overflow', 'hidden');
        });

        self.element.on('mouseleave', '.annotationsHolder', function(event) {
            jQuery('body').css('overflow', 'inherit');
        });

        self.element.find('.annotation-viewer-side .delete').confirm({
            title: 'Delete Annotation?',
            content: 'Would you like to delete your annotation? This is permanent.',
            buttons: {
                confirm: function() {
                    var annotation_id = this.$target[0].id.replace('delete-', '');
                    hxPublish('deleteAnnotationById', self.instance_id, [annotation_id]);
                    if (self.annotation_tool.viewer) {
                        jQuery('.annotation-viewer').remove();
                        delete self.annotation_tool.viewer;
                    }
                    self.toggleViewer(event, 'hide', annotations);
                },
                cancel: function () {
                }
            }
        });

        self.element.on('click', '.annotation-viewer-side .edit', function() {
            jQuery(this).click(function(event) {
                var id = jQuery(event.currentTarget).attr('id').replace('edit-', '');
                var found = undefined;
                jQuery.each(annotations, function(index, ann) {
                    if (ann.id === id) {
                        found = ann;
                    }
                });
                
                self.showEditor(found, true);
            });
        });

        self.setUpButtons();
    };

    $.Sidebar.prototype.setUpButtons = function() {
        var self = this;
        self.element.on('click', '#create-annotation-side', function(event) {
            if (self.currentSelection) {
                hxPublish('shouldHighlight', self.instance_id, [self.currentSelection]);
                // clears the selection of the text
                if (window.getSelection) {
                  if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                  } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                  }
                } else if (document.selection) {  // IE?
                  document.selection.empty();
                }
                self.showEditor(self.currentSelection, false);
            }
        });

        if (self.annotation_tool.annotations) {
            self.onLoad(self.annotation_tool.annotations);
        }
    };

    $.Sidebar.prototype.showEditor = function(annotation, updating) {
        var self = this;

        // set editing mode
        self.annotation_tool.editing = true;
        self.annotation_tool.updating = updating;

        self.element.append(self.annotation_tool.editorTemplate);

        // save the element to call upon later
        self.annotation_tool.editor = jQuery('#annotation-editor-' + self.instance_id.replace(/:/g, '-'));

        self.annotation_tool.editor.css({
            'position': 'fixed',
            'top': 0,
            'right': 0,
            'left': 'auto',
            'width': '400px',
            'height': '100%',
            'height': 'calc(100%)'
        });

        // closes the editor tool and does not save annotation
        self.annotation_tool.editor.find('.cancel').click(function () {
            self.hideEditor(annotation, false, true);
        });

        // closes the editor and does save annotations
        self.annotation_tool.editor.find('.save').click(function () {
            var text = annotator.util.escapeHtml(self.annotation_tool.editor.find('#annotation-text-field').val());

            hxPublish('saveAnnotation', self.instance_id, [annotation, text, !self.annotation_tool.updating]);
            self.hideEditor(annotation, false, false);
        });

        hxPublish('editorShown', self.instance_id, [self.annotation_tool.editor, annotation]);
    };

    $.Sidebar.prototype.hideEditor = function(annotation, redraw, should_erase) {
        var self = this;
        if (self.annotation_tool.editor) {
            self.annotation_tool.editor.remove();
        }
        self.annotation_tool.editing = false;
        if (redraw) {
            hxPublish('shouldUpdateHighlight', self.instance_id, [annotation]);
        } else if(!self.annotation_tool.updating && should_erase) {
            hxPublish('shouldDeleteHighlight', self.instance_id, [annotation]);
            self.annotation_tool.updating = false;
        } else if (!self.annotation_tool.updating && !should_erase) {
            self.annotation_tool.updating = false;
        }
        delete self.annotation_tool.editor;
    };

    $.Sidebar.prototype.onLoad = function(annotations) {
        var self = this;

        if (self.options.TEMPLATES.viewer) {
            var annotations_html = self.options.TEMPLATES.viewer({
                'viewerid': self.instance_id.replace(/:/g, '-'),
                'annotations': annotations
            });
            jQuery('.annotationsHolder').html(annotations_html);
        } else {
            self.annotation_tool.annotations = annotations; 
        }
    };


}(Hxighlighter));