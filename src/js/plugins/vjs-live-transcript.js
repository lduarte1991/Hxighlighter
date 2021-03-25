import * as videojs from 'video.js/dist/video.js'

(function($) {
  // Get the Component base class from Video.js
  var Component = videojs.getComponent('Component');

  // Allows the triggering of the creation annotations
  var TranscriptToggle = videojs.extend(Component, {

    // The constructor of a component receives two arguments: the
    // player it will be associated with and an object of options.
    constructor: function(player, options) {
      // It is important to invoke the superclass before anything else, 
      // to get all the features of components out of the box!
      Component.apply(this, arguments);
      this.player = player;
      this.isTranscriptOpen = false;
      this.player.on('toggleTranscriptDisplay', this.toggleTranscriptDisplay.bind(this));
      return this;
    },

    // The `createEl` function of a component creates its DOM element.
    createEl: function() {
      return videojs.dom.createEl('button', {
        className: 'vjs-toggle-transcript fas fa-quote-right',
        title: 'Toggle Live Transcript',
        onclick: function() {
          this.isTranscriptOpen = !this.isTranscriptOpen;
          this.player.trigger('toggleTranscriptDisplay', {
            'transcript': this.isTranscriptOpen
          });
        }.bind(this)
      });
    },

    toggleTranscriptDisplay: function(event, params) {
        if (params.transcript) {
            console.log(jQuery('.video-js.vjs-fill'))
            this.el().style.color = 'rgb(255, 255, 0)';
            jQuery('.video-js.vjs-fill').css('height', '75%');
        } else {
            this.el().style.color = 'rgb(255, 255, 255)';
            jQuery('.video-js.vjs-fill').css('height', '100%');
        }
        this.player.trigger('playerresize')
    },
  });
/***************************** Installing Components *****************************/
  // Register the component with Video.js, so it can be used in players.
  videojs.registerComponent('TranscriptToggle', TranscriptToggle);

  if (!$.globals.hasOwnProperty('vjs')) {
    $.globals['vjs'] = {};
  }
  if (!$.globals.vjs.hasOwnProperty('components')) {
    $.globals.vjs['components'] = []
  }

  $.globals.vjs.components.push(function(player) {
    player.controlBar.addChild('TranscriptToggle', {
      name: 'TranscriptToggle'
    });
  });

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));