var annotator = annotator ? annotator : require('annotator');

(function($){
    $.XPathDrawer = function(element, inst_id, hClass) {
        this.element = element;
        this.instance_id = inst_id;
        this.h_class = hClass;
        this.init();
    };

    $.XPathDrawer.prototype.init = function() {
        var self = this;
        this.highlighter = new annotator.ui.highlighter.Highlighter(this.element, {
            highlightClass: (self.h_class + ' annotator-hl')
        });

        jQuery(self.element).on('mouseover', '.' + self.h_class, function(event) {
            var annotations = self.getAnnotationsFromElement(event);
            Hxighlighter.publishEvent('ViewerDisplayOpen', self.instance_id, [event, annotations]);
        });

        jQuery(self.element).on('mouseleave', '.' + self.h_class, function(event) {
            Hxighlighter.publishEvent('ViewerDisplayClose', self.instance_id, [event]);
        });

        jQuery(self.element).on('click', '.' + self.h_class, function(event) {
            var annotations = self.getAnnotationsFromElement(event);
            Hxighlighter.publishEvent('DrawnSelectionClicked', self.instance_id, [event, annotations]);

        });

        Hxighlighter.subscribeEvent('StorageAnnotationDelete', self.instance_id, function(_, annotation) {
            self.undraw(annotation);
        });

        Hxighlighter.subscribeEvent('GetAnnotationsData', self.instance_id, function(_, callback) {
            callback(self.getAnnotationsData());
        });

        Hxighlighter.subscribeEvent('GetSpecificAnnotationData', self.instance_id, function(_, annotation_id, callback){
            callback(self.getSpecificAnnotationData(annotation_id));
        });

        Hxighlighter.subscribeEvent('changeDrawnColor', self.instance_id, function(_, annotation, color) {
            console.log('changeDrawnColor', color, annotation._local.highlights);
            if (annotation._local) {
                jQuery.each(annotation._local.highlights, function(_, hl) {
                    setTimeout(function() {jQuery(hl).css('background-color', color);}, 250);
                });
            }
        });
    };

    $.XPathDrawer.prototype.draw = function(annotation) {
        var self = this;
        this.highlighter.draw(annotation);
        $.publishEvent('annotationDrawn', self.instance_id, [annotation]);
        
        // code below allows you to undraw annotations by clicking on them, should this ever be needed in the future
        // jQuery.each(annotation._local.highlights, function(_, high) {
        //     jQuery(high).on('mouseover', function() {
        //          $.publishEvent('toggleViewer')
        //     });
        // });
    };

    $.XPathDrawer.prototype.undraw = function(annotation) {
        this.highlighter.undraw(annotation);
        $.publishEvent('annotationUndrawn', self.instance_id, [annotation]);
    };

    $.XPathDrawer.prototype.redraw = function(annotation) {
        this.highlighter.redraw(annotation);
        $.publishEvent('annotationRedrawn', self.instance_id, [annotation]);
    };

    $.XPathDrawer.prototype.getAnnotationsFromElement = function(event) {
        return jQuery(event.target).parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray();
    };

    $.XPathDrawer.prototype.getAnnotationsData = function() {
        return jQuery('.annotator-hl').parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray();
    };

    $.XPathDrawer.prototype.getSpecificAnnotationData = function(annotation_id) {
        var self = this;
        var currentAnnotations = self.getAnnotationsData();
        var foundAnnotation = currentAnnotations.find(function(ann) {
            if (ann.id === annotation_id) {
                return ann;
            }
        });
        return foundAnnotation
    }

    $.drawers.push($.XPathDrawer);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));