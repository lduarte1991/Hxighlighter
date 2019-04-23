/**
 * 
 */
 var annotator = annotator ? annotator : require('annotator');

import './css/floatingviewer.css';

 (function($) {
    $.FloatingViewer = function(options, inst_id) {
        // sets default options
        var defaultOptions = {
            // set up template names that will be pulled
            TEMPLATENAMES: [
                "editor",
                "viewer",
            ],
            TEMPLATES: {
                editor: require('./templates/editor-v2.html'),
                viewer: require('./templates/viewer-v2.html')
            },
            template_suffix: "v2",
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

    $.FloatingViewer.prototype.init = function() {
        var self = this;
        self.setUpTemplates(self.options.template_suffix);

        // make sure the viewer doesn't disappear when the person moves their mouse over it
        self.element.on('mouseover', '.annotation-viewer', function (event1) {
            clearTimeout(self.hideTimer);
        });

        // once they leave the viewer hide it
        self.element.on('mouseleave', '.annotation-viewer', function (event1) {
            clearTimeout(self.hideTimer);
            self.ViewerDisplayClose();
        });

        Hxighlighter.subscribeEvent('DrawnSelectionClicked', self.instance_id, function() {
            clearTimeout(self.hideTimer);
            self.annotation_tool.viewer.addClass('static');
        });
    };

    $.FloatingViewer.prototype.setUpTemplates = function (suffix) {
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

        jQuery.when.apply(jQuery, deferreds).done(function (){
            self.annotation_tool.editorTemplate = self.options.TEMPLATES.editor({
                editorid: self.instance_id.replace(/:/g, '-')
            });
        });
    };

    $.FloatingViewer.prototype.TargetSelectionMade = function(annotation, event) {
        if (event && event instanceof MouseEvent) {
            this.ViewerEditorOpen(annotation, false, $.mouseFixedPosition(event, annotation));
        }
    };

    $.FloatingViewer.prototype.ViewerEditorOpen = function(annotation, updating, interactionPoint) {
        var self = this;
        // set editing mode
        self.annotation_tool.editing = true;
        self.annotation_tool.updating = updating;

        // actually set up and draw the Editor
        var wrapperElement = self.element.find('.annotator-wrapper');
        wrapperElement.append(self.annotation_tool.editorTemplate);

        // save the element to call upon later
        self.annotation_tool.editor = jQuery('#annotation-editor-' + self.instance_id.replace(/:/g, '-'));

        var intPt = interactionPoint;
        // situate it on its proper location
        self.annotation_tool.editor.css({
            'top': intPt.top - jQuery(window).scrollTop(),
            'left': intPt.left
        });

        // closes the editor tool and does not save annotation
        self.annotation_tool.editor.find('.cancel').click(function () {
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, false, true]);
        });

        // closes the editor and does save annotations
        self.annotation_tool.editor.find('.save').click(function () {
            var text = annotator.util.escapeHtml(self.annotation_tool.editor.find('#annotation-text-field').val());
            annotation.annotationText.push(text);
            $.publishEvent('StorageAnnotationSave', self.instance_id, [annotation, text, !self.annotation_tool.updating]);
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, false, false]);
        });

        //self.checkOrientation(self.annotation_tool.editor);

        $.publishEvent('editorShown', self.instance_id, [self.annotation_tool.editor, annotation]);
    };

    $.FloatingViewer.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {
        var self = this;
        if (self.annotation_tool.editor) {
            self.annotation_tool.editor.remove();
        }
        delete self.annotation_tool.editor;
        self.annotation_tool.editing = false;
    };

    $.FloatingViewer.prototype.ViewerDisplayOpen = function(annotations) {
        var self = this;

        // if the timer is set for the tool to be hidden, this intercepts it
        if (self.hideTimer !== undefined) {
            clearTimeout(self.hideTimer);
        }
        
        self.annotation_tool.viewerTemplate = self.options.TEMPLATES['viewer']({
            'viewerid': self.instance_id.replace(/:/g, '-'),
            'annotations': annotations,
        });

        // add the viewer to the DOM
        self.element.find('.annotator-wrapper').append(self.annotation_tool.viewerTemplate);
        // collect the object for manipulation and coordinates of where it should appear
        if (self.annotation_tool.viewer) {
            self.annotation_tool.viewer.remove();
        }
        self.annotation_tool.viewer = jQuery('#annotation-viewer-' + self.instance_id.replace(/:/g, '-'));
        self.annotation_tool.viewer.css({
            'top': annotator.util.mousePosition(event).top - jQuery(window).scrollTop(),
            'left': annotator.util.mousePosition(event).left + 30
        });

        self.annotation_tool.viewer.data('annotations', annotations);

        self.annotation_tool.viewer.find('.cancel').click(function (event1) {
            $.publishEvent('ViewerDisplayClose', self.instance_id, [event1, annotations]);
        });

    };

    $.FloatingViewer.prototype.ViewerDisplayClose = function(annotations) {
        var self = this;
        self.hideTimer = setTimeout(function () {
            if (self.annotation_tool.viewer) {
                self.annotation_tool.viewer.remove();
                delete self.annotation_tool.viewer;
            }
        }, 500);
    };

    $.viewers.push($.FloatingViewer);

 }(Hxighlighter));
