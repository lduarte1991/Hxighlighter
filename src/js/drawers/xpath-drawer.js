var hrange = require('../h-range.js');

(function($){
    $.XPathDrawer = function(element, inst_id, hClass) {
        this.element = element;
        this.instance_id = inst_id;
        this.h_class = hClass + 'annotator-hl';
        this.init();
        this.drawnAnnotations = [];
    };

    $.XPathDrawer.prototype.init = function() {
        var self = this;
        // this.highlighter = new annotator.ui.highlighter.Highlighter(this.element, {
        //     highlightClass: (self.h_class + ' annotator-hl')
        // });

        jQuery(self.element).on('mouseover', '.' + self.h_class, function(event) {
            $.pauseEvent(event);
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
            if (annotation._local) {
                jQuery.each(annotation._local.highlights, function(_, hl) {
                    setTimeout(function() {jQuery(hl).css('background-color', color);}, 250);
                });
            }
        });

        Hxighlighter.subscribeEvent('undrawAll', self.instance_id, function(_, callBack) {
            var annotations = self.getAnnotationsData();
            annotations.forEach(function(ann) {
                self.undraw(ann);
            });
            callBack(annotations);
        });

        Hxighlighter.subscribeEvent('drawList', self.instance_id, function(_, annotations, callBack) {
            annotations.forEach(function(ann) {
                self.draw(ann);
            });
            callBack(annotations);
        })
    };

    $.XPathDrawer.prototype.draw = function(annotation) {
        var self = this;
        console.log("Annotation Being Drawn", annotation);
        // the process for drawing is divided into 4 parts
        // 1. Retrieve all discrete text nodes associated with annotation
        var textNodes = hrange.getTextNodesFromAnnotationRanges(annotation.ranges, self.element);
        // 2. Wrap each node with a span tag that has a particular annotation value (this.h_class)
        var spans = [];
        textNodes.forEach(function(node) {
            //console.log(node, jQuery(node));
            jQuery(node).wrap('<span class="annotator-hl"></span>');
            spans.push(jQuery(node).parent()[0]);
        });
        // 3. In a _local.highlights value, we store the list of span tags generated for the annotation.
        annotation['_local'] = {
            'highlights': spans
        };
        // 3. Store in each span tag the value of the annotation post-saving _local.highlights
        spans.forEach(function(span) {
            jQuery(span).data('annotation', annotation);
        });
        console.log(annotation);
        $.publishEvent('annotationDrawn', self.instance_id, [annotation]);
        

        // the annotation is then saved to the current list
        self.drawnAnnotations.push(annotation);
        // code below allows you to undraw annotations by clicking on them, should this ever be needed in the future
        // jQuery.each(annotation._local.highlights, function(_, high) {
        //     jQuery(high).on('mouseover', function() {
        //          $.publishEvent('toggleViewer')
        //     });
        // });
    };

    $.XPathDrawer.prototype.undraw = function(annotation) {
        //this.highlighter.undraw(annotation);
        $.publishEvent('annotationUndrawn', self.instance_id, [annotation]);
    };

    $.XPathDrawer.prototype.redraw = function(annotation) {
        var self = this;
        self.draw(annotation);
        //this.highlighter.redraw(annotation);
        //$.publishEvent('annotationRedrawn', self.instance_id, [annotation]);
    };

    $.XPathDrawer.prototype.getAnnotationsFromElement = function(event) {
        return jQuery(event.target).parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray();
    };

    // found @ https://dev.to/saigowthamr/how-to-remove-duplicate-objects-from-an-array-javascript-48ok
    $.XPathDrawer.prototype.getUnique = function(arr, comp) {
        const unique = arr
       .map(e => e[comp])

         // store the keys of the unique objects
        .map((e, i, final) => final.indexOf(e) === i && i)

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

       return unique;
    }

    $.XPathDrawer.prototype.getAnnotationsData = function() {
        var self = this;
        var all = self.getUnique(jQuery('.annotator-hl').parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray(), 'id');
        console.log(all);
        return all;
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