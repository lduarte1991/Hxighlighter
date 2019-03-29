/**
 * Should be listening for ways to select a text and then return an xpath 
 * object with the range that was selected.
 */
var $ = require('jquery');
var annotator = (typeof(annotator) == 'undefined') ? require('annotator') : annotator;

(function($){
    $.MouseSelector = function(element, inst_id, defaultOpts={}) {
        this.element = element;
        this.instance_id = inst_id;
        this.adder = null;
        this.mustConfirm = !!defaultOpts.confirm;
        this.init();
    };

    $.MouseSelector.prototype.init = function() {
        var self = this;

        // the "selector" which is what retrieves the ranges from a selection
        // in this case comes from a subset of the annotator.js code
        if (!Hxighlighter.exists(annotator) && Hxighlighter.exists(require)) {
            annotator = require('annotator');
        }
        
        // once it detects a mouse selection, it calculates the range and
        // sends it via an event to core
        self.selector = new annotator.ui.textselector.TextSelector(self.element, {
            onSelection: function(ranges, event) {
                // checks to make sure correct element is picked depending on mouse vs keyboard usage
                var commonAncestor = event.type === "mouseup" || ranges.length === 0 ? jQuery(event.target) : jQuery(ranges[0].commonAncestor);
                // checks to make sure event comes from the correct target object being selected
                if(commonAncestor.closest('.annotator-wrapper').parent().attr('id') === self.element.id) {
                    if (ranges.length > 0) {
                        if (self.mustConfirm) {
                            self.confirm(ranges, event);
                        } else {
                            Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, ranges, event]);
                        }
                    } else {
                        // must send this in order to detect when the user just clicks off 
                        // usually denoting they don't want to actually select something
                        // Hxighlighter.publishEvent('rangesEmpty', self.instance_id, []);
                        self.adder.hide();
                    }
                }
            }
        });

        // from Annotator v2.0 draws the button to make an annotation
        self.adder = new annotator.ui.adder.Adder({
            // if pserson clicks on the adder
            onCreate: function(range_set) {

                // clears the selection of the text
                if (window.getSelection) {
                  if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                  } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                  }
                } else if (document.selection) {  // IE?
                  document.selection.empty();
                }

               Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, range_set, event]);
            }
        });

        // attaches the adder to the current dom instance
        self.adder.attach();
    };

    $.MouseSelector.prototype.confirm = function(range, event) {
        this.interactionPoint = $.mouseFixedPosition(event);
        this.adder.load(range, this.interactionPoint);
        this.adder.checkOrientation();
        console.log(this.adder);
    }

    $.selectors.push($.MouseSelector);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
