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
    };

    $.XPathDrawer.prototype.draw = function(annotation) {
        var self = this;
        this.highlighter.draw(annotation);
        $.publishEvent('annotationDrawn', [annotation]);
        
        // code below allows you to undraw annotations by clicking on them, should this ever be needed in the future
        // jQuery.each(annotation._local.highlights, function(_, high) {
        //     jQuery(high).on('mouseover', function() {
        //          $.publishEvent('toggleViewer')
        //     });
        // });
    };

    $.XPathDrawer.prototype.undraw = function(annotation) {
        this.highlighter.undraw(annotation);
        $.publishEvent('annotationUndrawn', [annotation]);
    };

    $.XPathDrawer.prototype.redraw = function(annotation) {
        this.highlighter.redraw(annotation);
        $.publishEvent('annotationRedrawn', [annotation]);
    };

    $.XPathDrawer.prototype.getAnnotationsFromElement = function(event) {
        return jQuery(event.target).parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray();
    };

    $.drawers.push($.XPathDrawer);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));