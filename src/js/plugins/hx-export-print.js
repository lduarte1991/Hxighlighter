(function($) {
    $.ExportPlugin = function(options, inst_id) {
        this.options = options;
        this.element = this.options.slot;
        if (!jQuery(this.element).hasClass('annotator-wrapper')) {
            this.element = jQuery(this.element).find('.annotator-wrapper');
        }
        this.instance_id = inst_id;
        this.init();
    };

    $.ExportPlugin.prototype.init = function() {
        this.setUpButton();
    };

    $.ExportPlugin.prototype.saving = function(annotation) {
        return annotation;
    };

    $.ExportPlugin.prototype.setUpButton = function() {
        var self = this;
        jQuery('#print-annotations').show();
        if (self.options.instructors.indexOf(self.options.user_id) == -1) {
            jQuery('#export-annotations').remove();
        } else {
            jQuery('#export-annotations').show();
        }
        jQuery('#print-annotations').confirm({
            'title': "Which annotations would you like to print?",
            'buttons': {
                mine: {
                    text: 'Mine',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'm'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(mineButton) {
                        var p = self.printAnnotations.bind(self);
                        p("mine");
                    }
                },
                inst: {
                    text: 'Intructor',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'i'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(instButton) {
                        var p = self.printAnnotations.bind(self);
                        p('inst');
                    }
                },
                both: {
                    text: 'Both',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'b'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(bothButton) {
                        var p = self.printAnnotations.bind(self);
                        p('both');
                    }
                },
                cancel: function() {}
            }
        });
        jQuery('#export-annotations').confirm({
            'title': "Which annotations would you like to export?",
            'buttons': {
                mine: {
                    text: 'Mine',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'm'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(mineButton) {
                        var ex = self.exportAnnotations.bind(self);
                        ex("mine");
                    }
                },
                inst: {
                    text: 'Intructor',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'i'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(mineButton) {
                        var ex = self.exportAnnotations.bind(self);
                        ex("inst");
                    }
                },
                both: {
                    text: 'Both Mine + Instructor',
                    btnClass: 'btn-blue',
                    keys: ['enter', 'b'],
                    isHidden: false,
                    isDisabled: false,
                    action: function(mineButton) {
                        var ex = self.exportAnnotations.bind(self);
                        ex("both");
                    }
                },
                cancel: function () {}
            }
        });
        // jQuery(document).on('click', '#print-annotations', function(evt) {
        //     var p = self.printAnnotations.bind(self);
        //     p();
        // });
        // jQuery(document).on('click', '#export-annotations', function(evt) {
        //     var e = self.exportAnnotations.bind(self);
        //     e();
        // })
    };

    $.ExportPlugin.prototype.printAnnotations = function(whose) {
        var self =this;
        var options = {
            type: self.options.mediaType,
            limit: -1,
            offset: 0
        };
        if (whose === "mine") {
            options['userid'] = [self.options.user_id];
        } else if (whose === "inst") {
            options['userid'] = self.options.instructors;
        } else if (whose == "both") {
            options['userid'] = [self.options.user_id].concat(self.options.instructors);
        }
        $.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(results, converter) {
            var annotations = [];
            results.rows.forEach(function(ann) {
                annotations.push(converter(ann, self.element));
                
            });
            var html = "<h1>" + self.options.username + "</h1>";
            html += "<p>(" + results.size + " annotations out of " + results.total + ")</p>"
            html += "<style>table, th, td { border: 1px solid black;} table { border-collapse: collapse; } td, th {padding: 10px;} </style><table><tr><th>Username</th><th>Excerpt</th><th>Annotation</th><th>Tag</th><th>Timestamp</th></tr><tr>";
            jQuery.each(annotations, function(index, annotation) {
                if (annotation.common_name && annotation.common_name !== annotation.creator.name) {
                    html += "<td>" + annotation.common_name + "</td>";
                } else {
                    html += "<td>" + annotation.creator.name + "</td>";
                }
                if (annotation.media.toLowerCase() === "text") {
                    html += "<td>" + self.truncate(annotation.exact, 100, ' [ ... ] ') + "</td>";
                } else if(annotation.media.toLowerCase() === "image") {
                    html += "<td><img src=\""+annotation.thumbnail+"\" style=\"max-width: 150px; max-height: 150px;\"/></td>"
                } else if (annotation.media.toLowerCase() === "video") {
                    html += "<td>";
                    annotation.ranges.forEach(function(range) {
                         html+= range.startLabel + " - " + range.endLabel + "<br>";
                    });
                    html += "</td>";
                    html = html.replace('<th>Excerpt</th>', '<th>Annotated Time Range</th>')
                }
                
                html += "<td>";
                annotation.annotationText.forEach(function(text) {
                    html += text + "<br>"
                })
                html += "</td><td>";
                if (annotation.tags && annotation.tags.length > 0) {
                    jQuery.each(annotation.tags, function(tagIndex, tagName) {
                        html += tagName + "<br>";
                    });
                };
                html += "<td>" + annotation.created + "</td></tr>";
            });
            html += "</table>";
            var wnd = window.open("about:blank", "", "_blank");
            wnd.document.write(html);
        }]);
    };

    $.ExportPlugin.prototype.exportAnnotations = function(whose) {
        var self =this;
        var options = {
            type: self.options.mediaType,
            limit: -1,
            offset: 0
        };
        if (whose === "mine") {
            options['userid'] = [self.options.user_id];
        } else if (whose === "inst") {
            options['userid'] = self.options.instructors;
        } else if (whose == "both") {
            options['userid'] = [self.options.user_id].concat(self.options.instructors);
        }
        $.publishEvent('StorageAnnotationSearch', self.instance_id, [options, function(results, converter) {
            var annotations = [];
            results.rows.forEach(function(ann) {
                annotations.push(converter(ann, self.element));
            });

            var wnd = window.open('about:blank', "", "_blank");
            wnd.document.write("<p>(" + results.size + " annotations out of " + results.total + ")</p><textarea style='width:100%; height:100%;'>" + JSON.stringify(annotations, function(key, value) {
                if(key == "_local") {
                    return undefined
                } else {
                    return value;
                }
            }, 4) + "</textarea>");

        }]);

        // Hxighlighter.publishEvent('GetAnnotationsData', self.instance_id, [function(annotations) {
            
        //     annotations.forEach(function(ann) {

        //     })
        //     var wnd = window.open('about:blank', "", "_blank");
        //     wnd.document.write("<textarea style='width:100%; height:100%;'>" + JSON.stringify(annotations, function(key, value) {
        //         if(key == "_local") {
        //             return undefined
        //         } else {
        //             return value;
        //         }
        //     }, 4) + "</textarea>");
        // }])
    };

    $.ExportPlugin.prototype.truncate = function (fullStr, strLen, separator) {
        console.log(fullStr, strLen, separator);
        if (fullStr.length <= strLen) return fullStr;

        separator = separator || '...';

        var sepLen = separator.length,
            charsToShow = strLen - sepLen,
            frontChars = Math.ceil(charsToShow/2),
            backChars = Math.floor(charsToShow/2);

        return fullStr.substr(0, frontChars) + 
               separator + 
               fullStr.substr(fullStr.length - backChars);
    };

    $.plugins.push($.ExportPlugin)
}(Hxighlighter ? Hxighlighter : require('../hxighlighter.js')));