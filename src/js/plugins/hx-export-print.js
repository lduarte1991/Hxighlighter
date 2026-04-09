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
            'title': "Which annotations would you like to download to print?",
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
                    text: 'Both',
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

    $.ExportPlugin.prototype.download = function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    $.ExportPlugin.prototype.filterByWhose = function(annotations, whose) {
        var self = this;
        if (whose === "mine") {
            return annotations.filter(function(a) { return a.creator && a.creator.id === self.options.user_id; });
        } else if (whose === "inst") {
            return annotations.filter(function(a) { return a.creator && self.options.instructors.indexOf(a.creator.id) > -1; });
        } else {
            return annotations.filter(function(a) {
                return a.creator && (a.creator.id === self.options.user_id || self.options.instructors.indexOf(a.creator.id) > -1);
            });
        }
    };

    $.ExportPlugin.prototype.printAnnotations = function(whose) {
        var self = this;
        $.publishEvent('dumpStore', self.instance_id, [function(annotations) {
            var filtered = self.filterByWhose(annotations, whose);
            var html = "<h1>" + self.options.username + "</h1>";
            html += "<p>(" + filtered.length + " annotations)</p>";
            html += "<style>table, th, td { border: 1px solid black;} table { border-collapse: collapse; } td, th {padding: 10px;} </style><table><tr><th>Username</th><th>Excerpt</th><th>Annotation</th><th>Tag</th><th>Creation Date</th></tr><tr>";
            jQuery.each(filtered, function(index, annotation) {
                if (annotation.common_name && annotation.common_name !== annotation.creator.name) {
                    html += "<td>" + annotation.common_name + "</td>";
                } else {
                    html += "<td>" + (annotation.creator ? annotation.creator.name : '') + "</td>";
                }
                if (annotation.media && annotation.media.toLowerCase() === "video") {
                    html += "<td>";
                    if (annotation.ranges) {
                        annotation.ranges.forEach(function(range) {
                            html += range.startLabel + " - " + range.endLabel + "<br>";
                        });
                    }
                    html += "</td>";
                    html = html.replace('<th>Excerpt</th>', '<th>Annotated Time Range</th>');
                } else if (annotation.media && annotation.media.toLowerCase() === "image" && annotation.thumbnail) {
                    html += "<td><img src=\""+annotation.thumbnail+"\" style=\"max-width: 150px; max-height: 150px;\"/></td>";
                } else {
                    html += "<td>" + (annotation.exact ? self.truncate(annotation.exact, 100, ' [ ... ] ') : '') + "</td>";
                }
                html += "<td>";
                if (annotation.annotationText) {
                    annotation.annotationText.forEach(function(text) { html += text + "<br>"; });
                }
                html += "</td><td>";
                if (annotation.tags && annotation.tags.length > 0) {
                    annotation.tags.forEach(function(tag) { html += tag + "<br>"; });
                }
                html += "</td>";
                if (annotation.created) {
                    var t = annotation.created instanceof Date ? annotation.created : new Date(annotation.created);
                    var date = ('0' + t.getDate()).slice(-2);
                    var month = ('0' + (t.getMonth() + 1)).slice(-2);
                    var year = t.getFullYear();
                    var hours = ('0' + t.getHours()).slice(-2);
                    var minutes = ('0' + t.getMinutes()).slice(-2);
                    var seconds = ('0' + t.getSeconds()).slice(-2);
                    var time = date + '/' + month + '/' + year + ', ' + hours + ':' + minutes + ':' + seconds;
                    html += "<td>" + time + "</td>";
                } else {
                    html += "<td></td>";
                }
                html += "</tr>";
            });
            html += "</table>";
            self.download('annotations.html', html);
        }]);
    };

    $.ExportPlugin.prototype.exportAnnotations = function(whose) {
        var self = this;
        $.publishEvent('dumpStore', self.instance_id, [function(annotations) {
            var filtered = self.filterByWhose(annotations, whose);
            var html = JSON.stringify(filtered, function(key, value) {
                if (key == "_local") { return undefined; } else { return value; }
            }, 4);
            self.download('annotations.json', html);
        }]);
    };

    $.ExportPlugin.prototype.truncate = function (fullStr, strLen, separator) {
        // console.log(fullStr, strLen, separator);
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