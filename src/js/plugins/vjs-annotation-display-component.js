/*
 * Credit: A lot of this work comes from Daniel Cebrian's original
 * code that can be found in `videojs-annotator-plugin.js`
 */

import * as videojs from 'video.js/dist/video.js'

(function($) {
    // Get the Component base class from Video.js
    var Component = videojs.getComponent('Component');

    // Allows the triggering of the creation annotations
    var AnnotationViewerButton = videojs.extend(Component, {

        // The constructor of a component receives two arguments: the
        // player it will be associated with and an object of options.
        constructor: function(player, options) {
          // It is important to invoke the superclass before anything else, 
          // to get all the features of components out of the box!
          Component.apply(this, arguments);
          this.player = player;
          this.annotating = false;
          this.app_instance_id = player.options.instance_id;
          this.player.on('toggleAnnotations', this.toggleAnnotationsDisplay.bind(this));

          return this;
        },

        // The `createEl` function of a component creates its DOM element.
        createEl: function() {
          return videojs.dom.createEl('button', {
            className: 'vjs-annotation-viewer-button vjs-control vjs-button fas fa-comments',
            title: 'View Annotations',
            onclick: function() {
              this.annotating = !this.annotating;
              this.player.trigger('toggleAnnotations', {
                'isAnnotating': this.annotating
              });
            }.bind(this)
          });
        },

        toggleAnnotationsDisplay: function(event, params) {
            if (params.isAnnotating) {
                this.el().style.color = 'rgb(255, 255, 0)';
                this.player.trigger('toggleCreateAnnotation', {
                    'isAnnotating': false,
                });
            } else {
                this.el().style.color = null;
            }
        },
    });
    
    var BackAnDisplay = videojs.extend(Component, {
        constructor: function(player, options) {
            Component.apply(this, arguments);
            this.player = player;
            this.inStatsView = false;
            this.seekBar = player.controlBar.progressControl.seekBar;
            this.progressControl = player.controlBar.progressControl;
            this.player.on('toggleAnnotations', this.toggleAnnotationsDisplay.bind(this));
            this.player.on('toggleStatsView', this.toggleStatsView.bind(this));
            this.player.on('playerresize', this.resizeDisplay.bind(this));
            this.app_instance_id = player.options.instance_id;
            this.player.on('drawAnnotation', this.drawAnnotation.bind(this));
            this.player.on('playAnnotation', this.playAnnotation.bind(this));
            this.annotations = [];
            this.marginTop = 0;
            this.marginBottom = 0;
            return this;
        },

        createEl: function() {

            return videojs.dom.createEl('div', {
                className: 'vjs-back-anpanel-annotation',
                innerHTML: '<div class="vjs-hx-buttons annotation-view-togglers"><span class="fas fa-comments vjs-stats-annotations"></span><button class="vjs-stats-toggle fas fa-toggle-on fa-flip-horizontal" tabindex="0" title="Toggle Stats View"></button><span class="fas fa-chart-bar vjs-stats-chart"></span></div><div class="vjs-back-anpanel-scroll"></div><div class="vjs-back-stats-panel"><div class="vjs-stats-selection-display"></div><canvas class="vjs-char-anstat-annotation">Your browser does not support the HTML5 canvas tag.</canvas></div>'
            })
        },

        toggleAnnotationsDisplay: function(event, params) {
            if (params.isAnnotating) {
                this.resizeDisplay(event);
                this.el().style.display = 'block';
                this.setUpListeners();
                if (this.inStatsView) {
                    jQuery('.video-js .vjs-progress-control').addClass('stats-view')
                }
            } else {
                this.el().style.display = 'none';
                this.shutDownListeners();
                jQuery('.video-js .vjs-progress-control').removeClass('stats-view')
            }
        },

        resizeDisplay: function(event) {
            var playerHeight = this.player.el().scrollHeight;
            var controlBarHeight = this.player.controlBar.el().scrollHeight;
            var progressControlHeight = this.player.controlBar.progressControl.el().scrollHeight;
            var newHeight = playerHeight - controlBarHeight - progressControlHeight;
            this.el().style.height = newHeight + 'px';
            this.el().style.top = '-' + (newHeight + progressControlHeight) + 'px';
            this.seekBarOffset = this.seekBar.el().offsetLeft + this.progressControl.el().offsetLeft;
            this.seekBarWidth = this.seekBar.el().offsetWidth + this.progressControl.el().offsetWidth - 16;
            var annotationPanel = this.el().querySelector('.vjs-back-anpanel-scroll');
            var statsPanel = this.el().querySelector('.vjs-back-stats-panel');
            var progressControl = this.player.controlBar.progressControl;
            jQuery(annotationPanel).css('left', progressControl.el().offsetLeft);
            jQuery(annotationPanel).css('width', progressControl.el().offsetWidth - 16);
            jQuery(statsPanel).css('left', progressControl.el().offsetLeft);
            jQuery(statsPanel).css('width', progressControl.el().offsetWidth - 16);
        },

        getProgress: function(prog) {
            const duration = this.player.duration();
            if (isNaN(duration) || isNaN(prog)) {
                return 0;
            }
            return Math.min(1.0, Math.max(0.0, ((prog) / duration))) * 100.0;
        },

        drawAnnotation: function(event, data) {
            var annotationPanel = this.el().querySelector('.vjs-back-anpanel-scroll');
            var progressControl = this.player.controlBar.progressControl;

            this.seekBarOffset = this.seekBar.el().offsetLeft + this.progressControl.el().offsetLeft;
            this.seekBarWidth = this.seekBar.el().offsetWidth + this.progressControl.el().offsetWidth - 16;

            var ann = data['annotation'];
            var annotationStart = ann.ranges[0].start;
            var annotationEnd = ann.ranges[0].end;
            var start = parseFloat(this.getProgress(annotationStart));
            var end = parseFloat(this.getProgress(annotationEnd));
            var startPerc = start + "%";
            var widthPerc = (end - start) + "%";
            if (data['toEnd']) {
                jQuery(annotationPanel).append("<div class='hx-annotation-hl annotator-hl "+data['otherLabel']+"' id='hx-ann-"+ann.id+"' style='width: "+widthPerc+"; left: "+startPerc+"; '></div>");
            } else {
                jQuery(annotationPanel).prepend("<div class='hx-annotation-hl annotator-hl "+data['otherLabel']+"' id='hx-ann-"+ann.id+"' style='width: "+widthPerc+"; left: "+startPerc+"; '></div>");
            }
            var node = jQuery('#hx-ann-' + ann.id);
            ann['_local'] = {
                'highlights': [node]
            }
            node.data('annotation', ann);
        },

        playAnnotation: function(event, ann) {
            var self = this;
            
            // get start/end values pass it to playBetween
            jQuery('.annotation-viewer.static .cancel').click();
            if (typeof(ann.id) !== "undefined") {
                let annotationPanel = this.el().querySelector('.vjs-back-anpanel-scroll');
                let orig = jQuery('#hx-ann-' + ann.id)
                let animated = orig.clone(true);
                jQuery('div[id$="animated"]').remove()
                animated.attr('id', "hx-ann-" + ann.id + '-animated')
                animated.css({
                    'position': 'absolute',
                    'background': '#2e75af',
                    'bakcground': 'var(--pop-color)'
                })
                animated.appendTo(annotationPanel)
                animated.css({
                    'margin-top': orig.offset().top - animated.offset().top,
                })
                animated.animate({
                    top: "100%",
                    'margin-top': "-20px"
                }, 1000)
            }
            this.suspendPlay(function() {
                self._playBetween(ann.ranges[0].start, ann.ranges[0].end);
            });
            
        },

        _playBetween: function(start, end) {
            // seek to start point
            this.player.currentTime(start);
            this.player.play();
            this.startTime = start;
            this.endTime = end;
            //this.suspendPlay();
            this.player_.on("timeupdate", videojs.bind(this,this._processPlay));
            // set universal end point
            // console.log("Ran playBetween");
        },

        suspendPlay: function(promise) {
            this.fired = false;
            this.player_.off("timeupdate", videojs.bind(this,this._processPlay));
            if (typeof(promise) == "function") {
                // console.log("Ran suspendPlay");
                promise();
            }
        },

        _processPlay: function () {
            var self = this;
            //Check if current time is between start and end
            if(this.player_.currentTime() >= Math.floor(this.startTime) && (this.endTime < 0 || this.player_.currentTime() < this.endTime)){
                if(this.fired){ //Do nothing if start has already been called
                    return;
                }
                this.fired = true; //Set fired flag to true
            }else{
                if(!this.fired){ //Do nothing if end has already been called
                    this.suspendPlay();
                    setTimeout(function() { self.player_.pause()}, 250);
                    return;
                }
                this.fired = false; //Set fired flat to false
                
                setTimeout(function() { self.player_.pause()}, 250); //Call end function
                this.player_.currentTime(this.endTime);
                this.suspendPlay();
            }
        },

        _getNumberAnnotations: function(time1, end, allannotations) {
            var num = (typeof end !== 'undefined' && end) ? -1 : 0;
            // console.log(num, end, time1)
            var time = parseInt(time1)
            for (var index in allannotations) {
                var ann = allannotations[index];
                if(Math.floor(ann.ranges[0].start) <= time && Math.ceil(ann.ranges[0].end) >= time)
                    num++;
            }
            return num;
        },

        _drawCanvas: function() {
            var statsPanel = this.el().querySelector('.vjs-back-stats-panel');
            this.canvas = jQuery('.vjs-char-anstat-annotation')[0];
            this.canvas.width = statsPanel.offsetWidth;
            this.canvas.height = statsPanel.offsetHeight;
            var ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            Hxighlighter.publishEvent('GetSelectedFilterTypes', this.app_instance_id, function(filters) {
                if (filters.length === 0) {
                    filters = ['none']
                }
                jQuery('.vjs-stats-selection-display').html("Currently displaying the following annotations: " + filters.join(', '))
            })
            this._getPoints(function(points) {
                var maxEn = this._getMaxArray(points, 'entries');
                var w = this._getWeights(points);
                var duration = this.player.duration();

                    // Added dashed line function to paint
                if (window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.lineTo) {
                    CanvasRenderingContext2D.prototype.dashedLine = function(x1, y1, x2, y2, dashLen) {
                        if (dashLen === undefined) dashLen = 2;

                        this.beginPath();
                        this.moveTo(x1, y1);

                        var dX = x2 - x1;
                        var dY = y2 - y1;
                        var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
                        var dashX = dX / dashes;
                        var dashY = dY / dashes;

                        var q = 0;
                        while (q++ < dashes) {
                         x1 += dashX;
                         y1 += dashY;
                         this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
                        }
                        this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);

                        this.stroke();
                        this.closePath();
                    };
                }

                ctx.beginPath();
                ctx.strokeStyle = "rgb(255, 255, 0)";
                var lastSe = 0;
                var lastEn = 0;
                ctx.moveTo(0, maxEn * w.Y); // Move pointer to 0, 0
                for (var index in points) {
                    var p = points[index];
                    var x1 = lastSe * w.X, y1 = (maxEn - lastEn) * w.Y; // Old Point
                    var x2 = p.second * w.X, y2 = (maxEn - p.entries) * w.Y; // New Point
                    // new line
                    ctx.lineTo(x2, y1); // move horizontally to the new point
                    ctx.moveTo(x2, y1); // Move pointer
                    ctx.lineTo(x2, y2); // move vertically to the new point height
                    ctx.moveTo(x2, y2); // Prepare pointer for a new instance
                    // new rectangle under the curve
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(x1, y1, (x2 - x1), (maxEn * w.Y - y1));
                    
                    // store the last point
                    lastSe = p.second;
                    lastEn = p.entries;
                }
                // set the graphic to the end of the video
                ctx.lineTo(lastSe * w.X, maxEn * w.Y); 
                ctx.moveTo(lastSe * w.X, maxEn * w.Y); 
                ctx.lineTo(duration * w.X, maxEn * w.Y);
                ctx.stroke();
                
                // dashed line down
                ctx.beginPath();
                ctx.dashedLine(0, maxEn * w.Y, duration * w.X, maxEn * w.Y, 8);
                ctx.stroke();
                // dashed line top
                ctx.beginPath();
                ctx.dashedLine(0, 0, duration * w.X, 0, 8);
                ctx.stroke();
            }.bind(this));
        },

        _getMaxArray: function(points, variable) {
            var highest = 0;
            var tmp;
            for (var index in points) {
                tmp = points[index][variable];
                if (tmp > highest) highest = tmp;
            }
            return highest;
        },

        _getWeights: function(points){
            var weight = {};
            var panel = jQuery('.vjs-char-anstat-annotation');
            var maxSe = this.player.duration();
            var maxEn = this._getMaxArray(points, 'entries');
            var panelW = parseFloat(panel.css('width'));
            var panelH = parseFloat(panel.css('height')) - (this.marginTop + this.marginBottom);
            // console.log(maxSe, maxEn, panelW, panelH);
            weight.X = maxSe != 0 ? (panelW / maxSe) : 0;
            weight.Y = maxEn != 0 ? (panelH / maxEn) : 0;
            return weight;
        },

        _getPoints: function(callback) {
            var self = this;
            Hxighlighter.publishEvent('getDrawnAnnotations', this.app_instance_id, [function(anns) {
                var points_prep = {};
                anns.forEach(function(ann) {
                    var start = ann.ranges[0].start;
                    var end = ann.ranges[0].end;
                    var startIndex = Math.floor(start).toString();
                    var endIndex = Math.ceil(end).toString();
                    if (!(startIndex in points_prep)) {
                        points_prep[startIndex] = self._getNumberAnnotations(startIndex, false, anns);
                        if (startIndex == endIndex) { // is a point
                            points_prep[endIndex] = self._getNumberAnnotations(endIndex, true, anns)
                        }
                    }
                    if (!(endIndex in points_prep)) {
                        points_prep[endIndex] = self._getNumberAnnotations(endIndex, true, anns)
                    }
                });
                var points = [];
                for (var x in points_prep) {
                    points.push({
                        second: parseInt(x, 10),
                        entries: points_prep[x]
                    });
                }
                points.sort(function(a, b) {
                    return parseFloat(a.second) - parseFloat(b.second);
                });
                // console.log('POINTS', points);
                callback(points)
            }]);
        },

        toggleStatsView: function(event, params) {
            if (params.statsView) {
                jQuery(this.el()).find('.vjs-back-anpanel-scroll').css('display', 'none')
                jQuery(this.el()).find('.vjs-back-stats-panel').css('display', 'block')
                //jQuery('.vjs-stats-toggle').css('color', 'rgb(255,255,0)')
                jQuery('.vjs-stats-toggle').removeClass('fa-flip-horizontal')
                jQuery('.vjs-stats-chart').css('color', 'rgb(255, 255, 0)')
                jQuery('.vjs-stats-annotations').css('color', 'rgb(255, 255, 255)')
                jQuery('.video-js .vjs-progress-control').addClass('stats-view')
                this._drawCanvas();
            } else {
                jQuery(this.el()).find('.vjs-back-anpanel-scroll').css('display', 'block')
                jQuery(this.el()).find('.vjs-back-stats-panel').css('display', 'none')
                //jQuery('.vjs-stats-toggle').css('color', 'rgb(255, 255, 255)')
                jQuery('.vjs-stats-toggle').addClass('fa-flip-horizontal')
                jQuery('.vjs-stats-chart').css('color', 'rgb(255, 255, 255)')
                jQuery('.vjs-stats-annotations').css('color', 'rgb(255, 255, 0)')
                jQuery('.video-js .vjs-progress-control').removeClass('stats-view')
            }
        },

        toggleStats: function() {
            this.inStatsView = !this.inStatsView;
            this.player.trigger('toggleStatsView', {
                'statsView': this.inStatsView
            });
        },

        setUpListeners: function() {
            jQuery('.annotation-view-togglers').on('click', this.toggleStats.bind(this));
            Hxighlighter.subscribeEvent('StorageAnnotationLoad', this.app_instance_id, this._drawCanvas.bind(this));
            Hxighlighter.subscribeEvent('SelectedFilterTypesChanged', this.app_instance_id, function(_, filters) {
                if (filters.length === 0) {
                    filters = ['none']
                }
                jQuery('.vjs-stats-selection-display').html("Currently displaying the following annotations: " + filters.join(', '))
            });
        },

        shutDownListeners: function() {
            jQuery('.annotation-view-togglers').off('click');
        }

    });

    /***************************** Installing Components *****************************/
    // Register the component with Video.js, so it can be used in players.
    videojs.registerComponent('BackAnDisplay', BackAnDisplay);
    videojs.registerComponent('AnnotationViewerButton', AnnotationViewerButton);

    if (!$.globals.hasOwnProperty('vjs')) {
        $.globals['vjs'] = {};
    }
    if (!$.globals.vjs.hasOwnProperty('components')) {
        $.globals.vjs['components'] = []
    }

    $.globals.vjs.components.push(function(player) {
        player.controlBar.addChild('AnnotationViewerButton', {
          name: 'AnnotationViewerButton'
        });
        player.controlBar.addChild('BackAnDisplay', {
            name: 'BackAnDisplay'
        });
    });

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
