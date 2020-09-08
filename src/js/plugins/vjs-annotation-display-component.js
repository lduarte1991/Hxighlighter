/*
 * Credit: A lot of this work comes from Daniel Cebrian's original
 * code that can be found in `videojs-annotator-plugin.js`
 */

import * as videojs from 'video.js/dist/video.js'

(function($) {
    // Get the Component base class from Video.js
    var Component = videojs.getComponent('Component');
    
    var BackAnDisplay = videojs.extend(Component, {
        constructor: function(player, options) {
            Component.apply(this, arguments);
            this.player = player;
            this.player.on('toggleAnnotations', this.toggleAnnotationsDisplay.bind(this));
            this.player.on('playerresize', this.resizeDisplay.bind(this));
            return this;
        },

        createEl: function() {

            return videojs.dom.createEl('div', {
                className: 'vjs-back-anpanel-annotation',
                innerHTML: '<div class="vjs-back-anpanel-scroll"></div>'
            })
        },

        toggleAnnotationsDisplay: function(event, params) {
            if (params.isAnnotating) {
                this.resizeDisplay(event);
                this.el().style.display = 'block';
            } else {
                this.el().style.display = 'none';
            }
        },

        resizeDisplay: function(event) {
            var playerHeight = this.player.el().scrollHeight;
            var controlBarHeight = this.player.controlBar.el().scrollHeight;
            var newHeight = playerHeight - controlBarHeight;
            this.el().style.height = newHeight + 'px';
            this.el().style.top = '-' + newHeight + 'px';
        }

    });

    /***************************** Installing Components *****************************/
    // Register the component with Video.js, so it can be used in players.
    videojs.registerComponent('BackAnDisplay', BackAnDisplay);

    if (!$.globals.hasOwnProperty('vjs')) {
        $.globals['vjs'] = {};
    }
    if (!$.globals.vjs.hasOwnProperty('components')) {
        $.globals.vjs['components'] = []
    }

    $.globals.vjs.components.push(function(player) {
        player.controlBar.addChild('BackAnDisplay', {
            name: 'BackAnDisplay'
        });
    });

}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
