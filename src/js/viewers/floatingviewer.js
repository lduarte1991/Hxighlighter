/**
 * 
 */

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
        this.init();
    };

    $.FloatingViewer.prototype.init = function() {
        this.setUpTemplates(this.options.template_suffix);
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
        console.log(annotation);
        this.ViewerEditorOpen(annotation, false, $.mouseFixedPosition(event));
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

            $.publishEvent('saveAnnotation', self.instance_id, [annotation, text, !self.annotation_tool.updating]);
            $.publishEvent('hideEditor', self.instance_id, [annotation, false, false]);
        });

        //self.checkOrientation(self.annotation_tool.editor);

        $.publishEvent('editorShown', self.instance_id, [self.annotation_tool.editor, annotation]);
    };

    $.FloatingViewer.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {

    }

    $.viewers.push($.FloatingViewer);

 }(Hxighlighter));
