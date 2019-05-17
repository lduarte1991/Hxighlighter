/**
 * 
 */
 var annotator = annotator ? annotator : require('annotator');

import './css/floatingviewer.css';
import 'jquery-confirm';
import 'jquery-confirm/css/jquery-confirm.css'

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
                editor: require('./templates/editor-floating.html'),
                viewer: require('./templates/viewer-floating.html')
            },
            template_suffix: "floating",
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
            if (self.annotation_tool.isStatic) {
                return;
            }
            clearTimeout(self.hideTimer);
            self.ViewerDisplayClose();
        });

        Hxighlighter.subscribeEvent('DrawnSelectionClicked', self.instance_id, function(_, event1, annotations) {
            clearTimeout(self.hideTimer);
            try {
                self.annotation_tool.viewer.addClass('static');
                self.annotation_tool.isStatic = true;
            } catch(e) {
                self.ViewerDisplayOpen(annotations);
                self.annotation_tool.viewer.addClass('static');
                self.annotation_tool.isStatic = true;
            }
        });

        this.setUpPinAndMove();
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
        // if (event && event instanceof MouseEvent) {
            this.ViewerEditorOpen(annotation, false, $.mouseFixedPosition(event, annotation));
        // }
    };

    $.FloatingViewer.prototype.ViewerEditorOpen = function(annotation, updating, interactionPoint) {
        var self = this;
        if (self.annotation_tool.editing && self.annotation_tool.updating && self.annotation_tool.isStatic && !updating) {
            // there's already an open editor window for this instance so don't do anything
            return;
        }

        if (self.annotation_tool.viewer) {
            jQuery('.annotation-viewer').remove();
            delete self.annotation_tool.viewer;
            self.annotation_tool.isStatic = false;
            self.annotation_tool.updating = false;
            self.annotation_tool.editing = false;
        }

        // set editing mode
        self.annotation_tool.editing = true;
        self.annotation_tool.updating = updating;

        // actually set up and draw the Editor
        var wrapperElement = self.element.find('.annotator-wrapper');
        wrapperElement.after(self.annotation_tool.editorTemplate);

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
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, false, !updating]);
        });

        // closes the editor and does save annotations
        self.annotation_tool.editor.find('.save').click(function () {
            var text = self.annotation_tool.editor.find('#annotation-text-field').val();
            if (updating) {
                annotation.annotationText.pop();
            }
            annotation.annotationText.push(text);
            $.publishEvent('ViewerEditorClose', self.instance_id, [annotation, updating, false]);
        });

        self.annotation_tool.editor.find('#annotation-text-field').val(annotation.annotationText);
        setTimeout(function() {self.annotation_tool.editor.find('#annotation-text-field')[0].focus();}, 250);

        self.checkOrientation(self.annotation_tool.editor);
        $.publishEvent('editorShown', self.instance_id, [self.annotation_tool.editor, annotation]);
    };

    $.FloatingViewer.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {
        var self = this;
        if (self.annotation_tool.editor) {
            self.annotation_tool.editor.remove();
        }
        delete self.annotation_tool.editor;
        self.annotation_tool.editing = false;
        self.annotation_tool.updating = false;
        jQuery('body').css('overflow', 'inherit');
    };

    $.FloatingViewer.prototype.ViewerDisplayOpen = function(annotations) {
        var self = this;
        // if the timer is set for the tool to be hidden, this intercepts it
        if (self.hideTimer !== undefined) {
            clearTimeout(self.hideTimer);
            
        }

        if (self.annotation_tool.editing || self.annotation_tool.updating || (self.annotation_tool.isStatic && Hxighlighter.exists(self.annotation_tool.viewer))) {
            // there's already an open editor window for this instance so don't do anything
            return;
        }

        
        
        self.annotation_tool.viewerTemplate = self.options.TEMPLATES['viewer']({
            'viewerid': self.instance_id.replace(/:/g, '-'),
            'annotations': annotations,
        });

        // add the viewer to the DOM
        self.element.find('.annotator-wrapper').after(self.annotation_tool.viewerTemplate);
        // collect the object for manipulation and coordinates of where it should appear
        if (self.annotation_tool.viewer) {
            self.annotation_tool.viewer.remove();
            delete self.annotation_tool.viewer
        }
        self.annotation_tool.viewer = jQuery('#annotation-viewer-' + self.instance_id.replace(/:/g, '-'));
        var newTop = annotator.util.mousePosition(event).top - jQuery(window).scrollTop();
        var newLeft = annotator.util.mousePosition(event).left + 30
        self.annotation_tool.viewer.css({
            'top': newTop,
            'left': newLeft
        });

        self.annotation_tool.viewer.data('annotations', annotations);

        self.annotation_tool.viewer.find('.cancel').click(function (event1) {
            self.annotation_tool.isStatic = false;
            self.annotation_tool.viewer.remove();
            delete self.annotation_tool.viewer;
        });

        self.annotation_tool.viewer.find('.edit').click(function (event1) {
            var annotation_id = jQuery(this).attr('id').replace('edit-', '');
            var filtered_annotation = annotations.find(function(ann) { if (ann.id === annotation_id) return ann; });
            self.ViewerEditorOpen(filtered_annotation, true, {
                top: parseInt(self.annotation_tool.viewer.css('top'), 10),
                left: parseInt(self.annotation_tool.viewer.css('left'), 10)
            });

            //StorageAnnotationSave
        });

        self.annotation_tool.viewer.find('.delete').confirm({
            title: 'Delete Annotation?',
            content: 'Would you like to delete your annotation? This is permanent.',
            buttons: {
                confirm: function() {
                    var annotation_id = this.$target[0].id.replace('delete-', '');
                    var filtered_annotation = annotations.find(function(ann) { if (ann.id === annotation_id) return ann; });
                    $.publishEvent('StorageAnnotationDelete', self.instance_id, [filtered_annotation]);
                    self.ViewerDisplayClose();
                    if (self.annotation_tool.viewer) {
                        jQuery('.annotation-viewer').remove();
                        delete self.annotation_tool.viewer;
                        self.annotation_tool.isStatic = false;
                        self.annotation_tool.updating = false;
                        self.annotation_tool.editing = false;
                    }
                },
                cancel: function () {
                }
            }
        });
        
        $.publishEvent('displayShown', self.instance_id, [self.annotation_tool.viewer, annotations]);
        self.checkOrientation(self.annotation_tool.viewer);
    };

    $.FloatingViewer.prototype.ViewerDisplayClose = function(annotations) {
        var self = this;

        if (self.annotation_tool.isStatic) {
            return;
        }
        clearTimeout(self.hideTimer);
        self.hideTimer = setTimeout(function () {
            if (self.hideTimer) {
                if (self.annotation_tool.viewer) {
                    self.annotation_tool.viewer.remove();
                    delete self.annotation_tool.viewer;
                }
                self.annotation_tool.isStatic = false;
                self.annotation_tool.updating = false;
                self.annotation_tool.editing = false;
            }
        }, 500);
        
    };

    $.FloatingViewer.prototype.StorageAnnotationSave = function(annotations) {

    };

    $.FloatingViewer.prototype.StorageAnnotationDelete = function(annotation) {
        var self = this;
        jQuery('.annotation-viewer').remove();
        delete self.annotation_tool.viewer;
        self.annotation_tool.isStatic = false;
        self.annotation_tool.updating = false;
        self.annotation_tool.editing = false;
    }

     $.FloatingViewer.prototype.setUpPinAndMove = function() {
        var self = this;
        // keeps track of when mouse button is pressed
        jQuery('body').on('mousedown', function (event) {
            self.buttonDown = true;
        });

        // keeps track of when mouse button is let go
        jQuery('body').on('mouseup', function (event) {
            self.buttonDown = false;
        });

        // handles moving the editor by clicking and dragging
        jQuery('body').on('mousedown', '.annotation-editor-nav-bar', function (event){
            self.prepareToMove(true, event);
        });

        // handles moving the viewer by clicking and dragging
        jQuery('body').on('mousedown', '.annotation-viewer-nav-bar', function (event){
            self.prepareToMove(false, event);
        });


        jQuery('body').on('mousemove', function (event){
            self.moving(event);
        });

        jQuery('body').on('mouseup', function (event){
           self.finishedMoving(event);
        });

        jQuery('body').on('mouseover', '.annotation-editor', function(event) {
            jQuery('body').css('overflow', 'hidden');
        });

        jQuery('body').on('mouseleave', '.annotation-editor', function(event) {
            jQuery('body').css('overflow', 'inherit');
        });

        jQuery('body').on('mouseleave', function(event) {
            self.finishedMoving(event);
        })

    };

     $.FloatingViewer.prototype.prepareToMove = function(isEditor, event) {
        var self = this;
        self.itemMoving = isEditor ? self.annotation_tool.editor : self.annotation_tool.viewer;

        if (self.itemMoving) {
            $.pauseEvent(event);

            //turns on moving mode
            self.itemMoving.moving = true;

            // set initial mouse position offset by where on the editor the user clicked
            var move = annotator.util.mousePosition(event);
            var editorTop = parseInt(self.itemMoving.css('top'), 10);
            var editorLeft = parseInt(self.itemMoving.css('left'), 10);
            self.itemMoving.offsetTopBy = move.top - editorTop;
            self.itemMoving.offsetLeftBy = move.left - editorLeft;
        }
    };

    $.FloatingViewer.prototype.moving = function(event) {
        var self = this;
        if (self.itemMoving && self.itemMoving.moving) {
            $.pauseEvent(event);

            // gets the userlocation (where they've dragged to)
            var move = annotator.util.mousePosition(event);
            var newTop = move.top - self.itemMoving.offsetTopBy;
            var newLeft = move.left - self.itemMoving.offsetLeftBy;
            

            // var borderBox = self.element[0].getBoundingClientRect();
            if (newTop < 0) {
                newTop = 0;
            }
            if (newLeft < 0) {
                newLeft = 0;
            }
            if (newTop + self.itemMoving.outerHeight() > window.innerHeight) {
                newTop = window.innerHeight - self.itemMoving.outerHeight();
            }
            if (newLeft + self.itemMoving.outerWidth() > window.innerWidth) {
                newLeft = window.innerWidth - self.itemMoving.outerWidth();
            }

            /* TODO: Set boundaries for far right and far down */

            // sets the editor to that location (fixing offset)
            self.itemMoving.css({
                top: newTop,
                left: newLeft
            });

        } else if(self.buttonDown && self.annotation_tool.viewer && !self.annotation_tool.viewer.hasClass('static')) {
            self.annotation_tool.viewer.remove();
            delete self.annotation_tool.viewer;
        }
    };

    $.FloatingViewer.prototype.finishedMoving = function(event) {
        var self = this;
        if (self.itemMoving) {
            $.pauseEvent(event);

            //turns on moving mode
            self.itemMoving.moving = false;

            var move = annotator.util.mousePosition(event);
            self.annotation_tool.interactionPoint = {
                top: move.top - self.itemMoving.offsetTopBy,
                left: move.left - self.itemMoving.offsetLeftBy
            };
        }
    };

    $.FloatingViewer.prototype.checkOrientation = function(viewerElement) {
        var self = this;
        var newTop = parseInt(jQuery(viewerElement).css('top'), 10);
        var newLeft = parseInt(jQuery(viewerElement).css('left'), 10);
        var elWidth = parseInt(jQuery(viewerElement).outerWidth());
        var elHeight = parseInt(jQuery(viewerElement).outerHeight());

        if (newTop < 0) {
            newTop = 0;
        }
        if (newLeft < 0) {
            newLeft = 0;
        }
        if (newTop + elHeight > window.innerHeight) {
            newTop = window.innerHeight - elHeight - 34; // 34 is the height of the save/cancel buttons that get cut off
        }
        if (newLeft + elWidth > window.innerWidth) {
            newLeft = window.innerWidth - elWidth - 12; // 12 is the width of the scroll bar
        }

        jQuery(viewerElement).css('top', newTop);
        jQuery(viewerElement).css('left', newLeft);
    };

    $.viewers.push($.FloatingViewer);


}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
