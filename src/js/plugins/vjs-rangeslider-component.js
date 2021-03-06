
import * as videojs from 'video.js/dist/video.js'

(function($) {
  // Get the Component base class from Video.js
  var Component = videojs.getComponent('Component');

  // Allows the triggering of the creation annotations
  var AnnotateButton = videojs.extend(Component, {

    // The constructor of a component receives two arguments: the
    // player it will be associated with and an object of options.
    constructor: function(player, options) {
      // It is important to invoke the superclass before anything else, 
      // to get all the features of components out of the box!
      Component.apply(this, arguments);
      this.player = player;
      this.annotating = false;
      this.app_instance_id = player.options.instance_id;
      this.player.on('toggleCreateAnnotation', this.toggleAnnotationsDisplay.bind(this));
      var self = this;
      Hxighlighter.subscribeEvent('ViewerEditorClose', this.app_instance_id, function() {
        self.player.trigger('toggleCreateAnnotation', {
          'isAnnotating': false
        });
        self.player.trigger('toggleAnnotations', {
          'isAnnotating': true
        })
      });
      return this;
    },

    // The `createEl` function of a component creates its DOM element.
    createEl: function() {
      return videojs.dom.createEl('button', {
        className: 'vjs-annotate-button vjs-control vjs-button fas fa-highlighter',
        title: 'Annotate Clip',
        onclick: function() {
          this.annotating = !this.annotating;
          this.player.trigger('toggleCreateAnnotation', {
            'isAnnotating': this.annotating
          });
        }.bind(this)
      });
    },

    toggleAnnotationsDisplay: function(event, params) {
        if (params.isAnnotating) {
            this.el().style.color = 'rgb(255, 255, 0)';
            this.player.trigger('toggleAnnotations', {
              'isAnnotating': false
            });
        } else {
            this.el().style.color = null;
            jQuery('.hx-confirm-button').remove();
        }
    },
  });

  var LeftRangeSlider = videojs.extend(Component, {

    constructor: function(player, options) {
      Component.apply(this, arguments);
      this.player = player;
      this.seekBar = player.controlBar.progressControl.seekBar;
      this.player.on('seeking', this.handleMouseMove.bind(this));
      this.player.on('toggleCreateAnnotation', this.toggleSlider.bind(this));
      this.player.on('setRightRangeLimit', this.setLimit.bind(this));
      this.player.on('setLeft', this.setLeft.bind(this));
      this.heldDown = false;
      this.limit = 0.0;
      this.app_instance_id = player.options.instance_id;
      // console.log('look here plase', player, options);
      return this;
    },

    createEl: function() {
      var self = this;
      return videojs.dom.createEl('div', {
        className: 'vjs-lrs',
        onmousedown: function() {
          this.heldDown = true;
        }.bind(this),
        onmouseup: function() {
          this.heldDown = false;
        }.bind(this)
      });
    },

    getProgress: function() {
      const duration = this.player.duration();
      const prog = this.player.currentTime();
      if (isNaN(duration) || isNaN(prog)) {
        return 0;
      }
      return Math.min(1.0, Math.max(0.0, ((prog) / duration))) * 100.0;
    },

    handleMouseMove: function() {
      if(this.heldDown){
        const prog = this.getProgress();
        if ( prog < this.limit-1) {
          this.el().style.left = prog + '%';
          this.player.trigger('setLeftRangeLimit', prog);
        }
        
      }
    },

    toggleSlider: function(event, params) {

      if (params.isAnnotating) {
          this.el().style.display = 'block';
          const prog = this.getProgress();
          this.el().style.left = prog + '%';
          this.player.trigger('setLeftRangeLimit', prog);
        } else {
          this.el().style.display = 'none';
        }
      
    },

    setLimit: function(event, percent) {
      this.limit = percent;
    },

    setLeft: function(event, percent) {
      this.el().style.left = percent + '%';
    }
  });

  var RightRangeSlider = videojs.extend(Component, {

    constructor: function(player, options) {
      Component.apply(this, arguments);
      this.player = player;
      this.seekBar = player.controlBar.progressControl.seekBar;
      //this.on('mousedown', this.handleMouseMove.bind(this));
      this.player.on('seeking', this.handleMouseMove.bind(this));
      this.player.on('toggleCreateAnnotation', this.toggleSlider.bind(this));
      this.player.on('setLeftRangeLimit', this.setLimit.bind(this));
      this.player.on('setRight', this.setRight.bind(this));
      this.heldDown = false;
      this.limit = 0.0;
      this.app_instance_id = player.options.instance_id;
      return this;
    },

    createEl: function() {
      return videojs.dom.createEl('div', {
        className: 'vjs-rrs',
        onmousedown: function() {
          this.heldDown = true;
        }.bind(this),
        onmouseup: function() {
          this.heldDown = false;
        }.bind(this)
      });
    },

    getProgress: function(offset) {
      if (isNaN(offset)) {
        offset = 0.0;
      }
      const duration = this.player.duration();
      const prog = this.player.currentTime();
      if (isNaN(duration) || isNaN(prog)) {
        return 0;
      }
      return Math.min(1.0, Math.max(0.0, ((prog) / duration) + (offset / 100.0))) * 100.0;
    },

    handleMouseMove: function(event) {
      if(this.heldDown){
        const prog = this.getProgress();
        if (prog > this.limit+1) {
          this.el().style.left = prog + '%';
          this.player.trigger('setRightRangeLimit', prog);
        }
        
      }
      
    },

    toggleSlider: function(event, params) {

      if (params.isAnnotating) {
          this.el().style.display = 'block';
          const prog = this.getProgress(5.0);
          this.player.trigger('setRightRangeLimit', prog);
          this.el().style.left = prog + '%';
        } else {
          this.el().style.display = 'none';
        }
      
    },

    setLimit: function(event, percent) {
      this.limit = percent;
    },

    setRight: function(event, percent) {
      this.el().style.left = percent + '%';
    }
  });

  var RangeSlider = videojs.extend(Component, {
    constructor: function(player, options) {
      Component.apply(this, arguments);
      this.player = player;
      this.seekBar = player.controlBar.progressControl.seekBar;
      this.player.on('toggleCreateAnnotation', this.toggleSlider.bind(this));
      this.player.on('setLeftRangeLimit', this.setLimitLeft.bind(this));
      this.player.on('setRightRangeLimit', this.setLimitRight.bind(this));
      this.heldDown = false;
      this.limitL = 0.0;
      this.limitr = 0.0;
      this.app_instance_id = player.options.instance_id;
      return this;
    },

    createEl: function() {
      return videojs.dom.createEl('div', {
        className: 'vjs-rs',
        onmousedown: function() {
          this.heldDown = true;
        }.bind(this),
        onmouseup: function() {
          this.heldDown = false;
        }.bind(this)
      });
    },

    setLimitLeft: function(event, percent) {
      this.limitL = percent;
      this.updateElement();
    },

    setLimitRight: function(event, percent) {
      this.limitR = percent;
      this.updateElement();
    },

    updateElement: function() {
      let width = this.limitR - this.limitL;
      this.el().style.width = width + '%';
      this.el().style.left = this.limitL + '%';
      var percentLeft = this.limitL / 100.00;
      var percentRight = this.limitR / 100.00;
      var duration = this.player.duration();
      var secondLeft = percentLeft * duration;
      var secondRight = percentRight * duration;
      Hxighlighter.publishEvent('videoRangeSelected', this.app_instance_id, [this.el(), {start: secondLeft, startLabel: this.humanReadable(secondLeft), end: secondRight, endLabel: this.humanReadable(secondRight)}])
      this.player.pause();
    },

    toggleSlider: function(event, params) {

      if (params.isAnnotating) {
          this.el().style.display = 'block';
        } else {
          this.el().style.display = 'none';
        }
      
    },

    humanReadable: function(seconds_float) {
      var dur = this.player.duration();
      if (dur < 60) {
        return parseInt(seconds_float, 10) + "s";
      } else if (dur < 3600) {
        var mins = parseInt(seconds_float / 60, 10);
        var secs = parseInt(seconds_float % 60, 10);
        return this.pad(mins, 2) + ":" + this.pad(secs, 2);
      } else {
        var hours = parseInt(seconds_float / 3600, 10);
        var leftovers = seconds_float % 3600;
        var mins = parseInt(leftovers / 60, 10);
        var secs = parseInt(leftovers % 60, 10);
        return this.pad(hours, 2) + ":" + this.pad(mins,2) + ":" + this.pad(secs, 2);
      }
    },

    pad: function(num, size) {
      var s = num+"";
      while (s.length < size) s = "0" + s;
      return s;
    }


    // TODO: slide together?

  });


  var RangeSliderText = videojs.extend(Component, {
    constructor: function(player, options) {
      Component.apply(this, arguments);
      this.player = player;
      this.seekBar = player.controlBar.progressControl.seekBar;
      this.app_instance_id = player.options.instance_id;
      this.player.on('toggleCreateAnnotation', this.toggleSlider.bind(this));
      this.player.on('setLeftRangeLimit', this.setStart.bind(this));
      this.player.on('setRightRangeLimit', this.setEnd.bind(this));
      return this;
    },

    createEl: function() {
      return videojs.dom.createEl('div', {
        className: 'vjs-rangeslider-text-input',
        innerHTML: '<span>Start:</span><input type="text" id="vjs-start-range-text-input" /><br><span>End:</span><input type="text" id="vjs-end-range-text-input"/><br><button id="vjs-range-text-update">Update Time Range</button><button id="vjs-range-text-preview-clip">Play Clip</button><br><button id="vjs-range-text-annotate">Annotate Selection</button>'
      });
    },

    toggleSlider: function(event, params) {

      if (params.isAnnotating) {
          this.el().style.display = 'block';
          this.setUpListeners();
        } else {
          this.el().style.display = 'none';
          this.closeUpListeners();
        }
      
    },

    updateTime: function() {
      var startTimes = jQuery('#vjs-start-range-text-input').val()
      var endTimes = jQuery('#vjs-end-range-text-input').val()

      var startSeconds = this.parseTime(startTimes)
      var endSeconds = this.parseTime(endTimes)
      var duration = this.player.duration()

      var startPercent = this.getPercent(startSeconds, duration)
      var endPercent = this.getPercent(endSeconds, duration);
      if (startPercent > endPercent) {
        endPercent = startPercent;
      }

      this.player.trigger('setLeftRangeLimit', startPercent);
      this.player.trigger('setRightRangeLimit', endPercent);
      this.player.trigger('setLeft', startPercent);
      this.player.trigger('setRight', endPercent);

    },

    getPercent: function(prog, duration) {
      return Math.min(1.0, Math.max(0.0, ((prog) / duration))) * 100.0;
    },

    parseTime: function(timeString) {
      var timeRange = timeString.split(':')
      var timeDivisor = Math.pow(60, (timeRange.length - 1))
      var timeCounter = parseInt(timeRange.pop().replace(/\D/g,''), 10)
      timeRange.forEach(function(el) {
        timeCounter += timeDivisor * parseInt(el, 10);
        timeDivisor = timeDivisor / 60;
      });
      return timeCounter
    },

    previewClip: function() {
      this.updateTime();
      var startTimes = jQuery('#vjs-start-range-text-input').val()
      var endTimes = jQuery('#vjs-end-range-text-input').val()

      var startSeconds = this.parseTime(startTimes)
      var endSeconds = this.parseTime(endTimes)
      if (startSeconds > endSeconds) {
        jQuery('#vjs-end-range-text-input').val(startTimes)
        endSeconds = startSeconds;
      }
      var fakeAnn = {
        'ranges': [{
          'start': startSeconds,
          'end': endSeconds
        }]
      }
      this.player.trigger('playAnnotation', fakeAnn);
    },

    annotateClip: function() {
      jQuery('.hx-confirm-button button').trigger('click');
    },

    setUpListeners: function() {
      jQuery('#vjs-range-text-update').on('click', this.updateTime.bind(this));
      jQuery('#vjs-range-text-preview-clip').on('click', this.previewClip.bind(this));
      jQuery('#vjs-range-text-annotate').on('click', this.annotateClip.bind(this));
    },

    closeUpListeners: function() {
      jQuery('#vjs-range-text-update').off('click');
      jQuery('#vjs-range-text-preview-clip').off('click');
      jQuery('#vjs-range-text-annotate').off('click');
    },

    setStart: function(event, percent) {
      var dur = this.player.duration();
      var humanReadableVal = this.humanReadable((percent/100.0) * dur);
      jQuery('#vjs-start-range-text-input').val(humanReadableVal);
    },

    setEnd: function(event, percent) {
      var dur = this.player.duration();
      var humanReadableVal = this.humanReadable((percent/100.0) * dur);
      jQuery('#vjs-end-range-text-input').val(humanReadableVal);
    },

    humanReadable: function(seconds_float) {
      var dur = this.player.duration();
      if (dur < 60) {
        return parseInt(seconds_float, 10) + "s";
      } else if (dur < 3600) {
        var mins = parseInt(seconds_float / 60, 10);
        var secs = parseInt(seconds_float % 60, 10);
        return this.pad(mins, 2) + ":" + this.pad(secs, 2);
      } else {
        var hours = parseInt(seconds_float / 3600, 10);
        var leftovers = seconds_float % 3600;
        var mins = parseInt(leftovers / 60, 10);
        var secs = parseInt(leftovers % 60, 10);
        return this.pad(hours, 2) + ":" + this.pad(mins,2) + ":" + this.pad(secs, 2);
      }
    },

    pad: function(num, size) {
      var s = num+"";
      while (s.length < size) s = "0" + s;
      return s;
    }
  });



  /***************************** Installing Components *****************************/
  // Register the component with Video.js, so it can be used in players.
  videojs.registerComponent('AnnotateButton', AnnotateButton);
  videojs.registerComponent('LeftRangeSlider', LeftRangeSlider);
  videojs.registerComponent('RightRangeSlider', RightRangeSlider);
  videojs.registerComponent('RangeSlider', RangeSlider);
  videojs.registerComponent('RangeSliderText', RangeSliderText);

  if (!$.globals.hasOwnProperty('vjs')) {
    $.globals['vjs'] = {};
  }
  if (!$.globals.vjs.hasOwnProperty('components')) {
    $.globals.vjs['components'] = []
  }

  $.globals.vjs.components.push(function(player) {
    player.controlBar.addChild('AnnotateButton', {
      name: 'AnnotateButton'
    });
    player.controlBar.progressControl.seekBar.addChild('LeftRangeSlider', {
      name: 'LeftRangeSlider'
    });
    player.controlBar.progressControl.seekBar.addChild('RightRangeSlider', {
      name: 'RightRangeSlider'
    });
    player.controlBar.progressControl.seekBar.addChild('RangeSlider', {
      name: 'RangeSlider'
    });
    player.controlBar.addChild('RangeSliderText', {
      name: 'RangeSliderText'
    });
  });

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
