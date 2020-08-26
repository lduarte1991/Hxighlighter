/**
 * Should be listening for ways to select a video
 */

var jQuery = require('jquery');
var hrange = require('../h-range.js');

(function($){
    $.TimeSelector = function(element, inst_id, defaultOpts={}) {
        this.element = element;
        this.instance_id = inst_id;
        this.adder = null;
        this.wrapperSelector = '.annotator-wrapper'
        this.mustConfirm = !!defaultOpts.confirm;
        console.log('one')
        this.init();
    };

    $.TimeSelector.prototype.init = function() {
        var self = this;
        console.log('two')
        self.setUpListeners();
    };

    $.TimeSelector.prototype.setUpListeners = function() {
        var self = this;
        console.log('setted up the listeners');
        console.log($);
        console.log($.subscribeEvent);
        console.log(self.instance_id);
        $.subscribeEvent('videoRangeSelected', self.instance_id, function(_, el, timeRange) {
            self.onSelection(el, timeRange);
        });
    }

    $.TimeSelector.prototype.onSelection = function(anchor, range, event) {
        var self = this;
        //console.log('onSelection Ran: ', range, event);
        console.log(self.mustConfirm)
        console.log(range);
        console.log(anchor);
        if (self.mustConfirm) {
            //console.log("Confirming...")
            setTimeout(function() {self.confirm(range, anchor)}, 150);
        } else {
            //console.log("Sending TargetSelection to Hxighlighter");
            //console.log(hrange.serializeRange(range, self.element, 'annotator-hl'));
            Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [range], event]);
        }
    };

    $.TimeSelector.prototype.confirm = function(range, anchor) {
        var self = this;
        self.hideConfirm();
        if (self.element.querySelectorAll('.annotation-editor-nav-bar').length == 0 && self.element.querySelectorAll('.annotation-viewer-nav-bar').length == 0) {
            var rect1 = anchor.getBoundingClientRect();

            self.interactionPoint = {
                top: rect1.top,
                left: rect1.left + (rect1.width / 2.0)
            }
            console.log(self.interactionPoint);
            //console.log(hrange.serializeRange(range, self.element, 'annotator-hl'));
            self.loadButton(range, self.interactionPoint, anchor);
            //console.log("Should have loaded button to confirm annotation");
        } else {
            $.publishEvent('HxAlert', self.instance_id, ["You have a pinned annotation window. Close it to make a new annotation.", {buttons:[], time:5}])
        }
    };

    $.TimeSelector.prototype.hideConfirm = function() {
        jQuery('.hx-confirm-button').remove();
    };

    $.TimeSelector.prototype.loadButton = function(range, iP, event) {
        var self = this;
        if (iP.top <= 48) {
            iP.top = 49;
        }
        var confirmButtonTemplate = "<div class='hx-confirm-button' style='top:"+(iP.top- 10)+"px; left: "+iP.left+"px;'><button><span class='fas fa-highlighter'></span></button></div>"
        console.log(confirmButtonTemplate, iP);
        jQuery('body').append(confirmButtonTemplate);
        jQuery('.hx-confirm-button button').click(function(event1) {
            //$.publishEvent('drawTemp', self.instance_id, [[range]])
            $.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [range], event1]);
            jQuery('.hx-confirm-button').remove();
        });
   };

    $.selectors.push($.TimeSelector);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
