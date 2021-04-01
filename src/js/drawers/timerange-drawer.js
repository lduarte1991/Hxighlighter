(function($){
    $.TimeRangeDrawer = function(element, inst_id, hClass, options) {
        this.element = element;
        this.instance_id = inst_id;
        this.h_class = (hClass + ' annotator-hl').trim();
        this.init();
        this.drawnAnnotations = [];
        this.tempHighlights = [];
        this.options = options || {};
    };

    $.TimeRangeDrawer.prototype.init = function() {
        var self = this;

        self.setUpListeners();
    };

    $.TimeRangeDrawer.prototype.setUpListeners = function() {
        var self = this;
        jQuery(self.element).on('mouseover', '.' + self.h_class.replace(' ', '.'), function(event) {
            $.pauseEvent(event);
            var annotations = self.getAnnotationsFromElement(event);
            // console.log("MOUSEOVER", annotations);
            Hxighlighter.publishEvent('ViewerDisplayOpen', self.instance_id, [event, annotations]);
        });

        jQuery(self.element).on('mouseleave', '.' + self.h_class.replace(' ', '.'), function(event) {
            Hxighlighter.publishEvent('ViewerDisplayClose', self.instance_id, [event]);
        });

        jQuery(self.element).on('click', '.' + self.h_class.replace(' ', '.'), function(event) {
            var annotations = self.getAnnotationsFromElement(event);
            Hxighlighter.publishEvent('DrawnSelectionClicked', self.instance_id, [event, annotations]);
        });

        Hxighlighter.subscribeEvent('getDrawnAnnotations', self.instance_id, function(_, callback) {
            callback(self.drawnAnnotations);
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
                    setTimeout(function() {jQuery(hl).css('background-color', color.replace('0.3)', '0.6)'));}, 250);
                });
            }
        });
    };

    $.TimeRangeDrawer.prototype.refreshDisplay = function(player) {
        var self = this;
        var anns = self.drawnAnnotations.slice();
        anns.forEach(function(ann) {
            self.undraw(ann, player);
            self.draw(ann, player)
        });
    }

    $.TimeRangeDrawer.prototype.draw = function(annotation, player, toEnd) {
        var self = this;

        var existing_drawn_annotation = self.getSpecificAnnotationData(annotation.id);
        if (existing_drawn_annotation) {
            self.undraw(existing_drawn_annotation)
        }
        var otherLabel = '';
        if (self.options.user_id === annotation.creator.id) {
            otherLabel += ' annotation-mine';
        }
        if (self.options.instructors.indexOf(annotation.creator.id) > -1) {
            otherLabel += ' annotation-instructor';
        }
        player.trigger('drawAnnotation', {
            'annotation': annotation,
            'otherLabel': otherLabel,
            'toEnd': toEnd
        });

        $.publishEvent('annotationDrawn', self.instance_id, [annotation]);

        // the annotation is then saved to the current list
        self.drawnAnnotations.push(annotation);
    };

    $.TimeRangeDrawer.prototype.undraw = function(annotation, player) {
        var self = this;
        if (annotation._local) {
            annotation._local.highlights.forEach(function(el) {
                jQuery(el).remove();
            });
        }
        self.drawnAnnotations = self.drawnAnnotations.filter(function(ann) {
            if (ann.id !== annotation.id) {
                return ann;
            }
        });
        //console.log(self.drawnAnnotations);
        $.publishEvent('annotationUndrawn', self.instance_id, [annotation]);
    };

    $.TimeRangeDrawer.prototype.redraw = function(annotation, player) {
        var self = this;
        self.undraw(annotation);
        self.draw(annotation, player);
        //this.highlighter.redraw(annotation);
        //$.publishEvent('annotationRedrawn', self.instance_id, [annotation]);
    };

    $.TimeRangeDrawer.prototype.getAnnotationsFromElement = function(event) {
        return jQuery(event.target).parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray().sort(function(a, b) {
            return a.created - b.created;
        });
    };

    // found @ https://dev.to/saigowthamr/how-to-remove-duplicate-objects-from-an-array-javascript-48ok
    $.TimeRangeDrawer.prototype.getUnique = function(arr, comp) {
        const unique = arr
       .map(e => e[comp])

         // store the keys of the unique objects
        .map((e, i, final) => final.indexOf(e) === i && i)

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

       return unique;
    }

    $.TimeRangeDrawer.prototype.getAnnotationsData = function() {
        var self = this;
        var all = self.getUnique(jQuery('.annotator-hl').parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray(), 'id');
        all.sort(function(a, b) {
            return b - a;
        })
        //console.log(all);
        return all;
    };

    $.TimeRangeDrawer.prototype.getSpecificAnnotationData = function(annotation_id) {
        var self = this;
        var currentAnnotations = self.getAnnotationsData();
        // console.log(currentAnnotations)
        var foundAnnotation = currentAnnotations.find(function(ann) {
            if (ann.id === annotation_id) {
                return ann;
            }
        });
        return foundAnnotation
    };

    $.drawers.push($.TimeRangeDrawer);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));