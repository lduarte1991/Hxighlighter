/**
 * Should be listening for ways to select a text and then return an xpath 
 * object with the range that was selected.
 */

var jQuery = require('jquery');
var hrange = require('../h-range.js');

(function($){
    $.MouseSelector = function(element, inst_id, defaultOpts={}) {
        this.element = element;
        this.instance_id = inst_id;
        this.adder = null;
        this.wrapperSelector = '.annotator-wrapper'
        this.mustConfirm = !!defaultOpts.confirm;
        this.init();
    };

    $.MouseSelector.prototype.init = function() {
        var self = this;
        self.setUpListeners();
    };

    $.MouseSelector.prototype.setUpListeners = function() {
        var self = this;
        this.element.addEventListener('mouseup', function(event) {
            var selection = window.getSelection();
            var selectionRange = selection.getRangeAt(0);
            self.onSelection(selectionRange, event);
        });
    }

    $.MouseSelector.prototype.onSelection = function(range, event) {
        var self = this;
        //console.log('onSelection Ran: ', range, event);
        if (range instanceof Range) {
            //console.log('range is instance of Range', range.toString());
            var result = self.shouldBeAnnotated(range);
            //console.log(result ? 'commonAncestor falls within wrapper' : 'should not be annotated');
            if (result && range.toString().length > 0) {
                if (self.mustConfirm) {
                    //console.log("Confirming...")
                    self.confirm(range, event)
                } else {
                    //console.log("Sending TargetSelection to Hxighlighter");
                    // console.log(hrange.serializeRange(range, self.element, 'annotator-hl'));
                    Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [hrange.serializeRange(range, self.element, 'annotator-hl')], event]);
                }
            } else {
                // send message to erase confirm button
                //console.log('Either result is false or toString() returned 0')
                self.hideConfirm();
            }
        }
    };

    $.MouseSelector.prototype.shouldBeAnnotated = function(range) {
        var self = this;
        var wrapper = self.element.querySelector(self.wrapperSelector);
        var testingNode = range.commonAncestorContainer;
        while (testingNode !== wrapper && testingNode !== null) {
            testingNode = testingNode.parentNode;
        }
        return testingNode === wrapper;
    };

    $.MouseSelector.prototype.confirm = function(range, event) {
        var self = this;
        self.hideConfirm();
        if (self.element.querySelectorAll('.annotation-editor-nav-bar').length == 0) {
            self.interactionPoint = $.mouseFixedPosition(event);
            // console.log(hrange.serializeRange(range, self.element, 'annotator-hl'));
            self.loadButton(hrange.serializeRange(range, self.element, 'annotator-hl'), self.interactionPoint, event);
            //console.log("Should have loaded button to confirm annotation");
        }
    };

    $.MouseSelector.prototype.hideConfirm = function() {
        jQuery('.hx-confirm-button').remove();
    };

    $.MouseSelector.prototype.loadButton = function(range, iP, event) {
        var self = this;
        var confirmButtonTemplate = "<div class='hx-confirm-button' style='top:"+iP.top+"px; left: "+iP.left+"px;'><button><span class='fas fa-highlighter'></span></button></div>"
        jQuery('body').append(confirmButtonTemplate);
        jQuery('.hx-confirm-button button').click(function() {
            $.publishEvent('drawTemp', self.instance_id, [[range]])
            $.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [range], event]);
            jQuery('.hx-confirm-button').remove();
        });
   };

    $.selectors.push($.MouseSelector);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
