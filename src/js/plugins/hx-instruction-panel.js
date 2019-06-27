/**
 *  InstructionPanel Annotations Plugin
 *  
 *
 */

//uncomment to add css file
require('./hx-instruction-panel.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.InstructionPanel = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        console.log("INSTRUCTION PANEL CREATED");
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.InstructionPanel.prototype.init = function() {
        var self = this;
        self.setUpInstructions();
    };

    $.InstructionPanel.prototype.setUpInstructions = function() {
        var self = this;
        console.log(self.options.instructions, typeof(self.options.instructions));
        var container = '<div class="instructions-container" style="display:block;"><div class="instructions-title">Instructions<span href="#" class="toggle-instructions" role="button" data-toggle="collapse" data-target=".instructions-body" id="toggle-instructions" aria-controls="annotation-instructions" tabindex="0" role="button">Collapse Instructions</span></div><section class="instructions-body collapse in" aria-expanded="true" aria-live="polite" id="annotation-instructions">'+self.options.instructions+'</section></div>'
        jQuery(self.options.slot).prepend(container);
         // toggles the label for toggling instructions
        var inst_area = jQuery(self.options.slot).find('.toggle-instructions');
        inst_area.click(function (){
            if (inst_area.html() == "Collapse Instructions") {
                inst_area.html('Expand Instructions');
            } else {
                inst_area.html('Collapse Instructions');
            }
        });
    };

    $.InstructionPanel.prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.InstructionPanel, 'name', {
        value: "InstructionPanel"
    });


    $.plugins.push($.InstructionPanel);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
