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

    $.drawers.push($.XPathDrawer);

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));