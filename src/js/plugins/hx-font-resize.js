/**
 *  FontResize Annotations Plugin
 *  
 *
 */

// require('./FontResize.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.FontResize = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.toggleTextSize(0);
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.FontResize.prototype.init = function() {
        var self = this;
        self.setUpButtons();
    };

    $.FontResize.prototype.setUpButtons = function() {
        var self = this;
        jQuery(self.options.slot).prepend('<div class="btn-group" role="group" aria-label="Control Annotation Text Size" aria-live="polite" ><div class="pull-left" style="padding: 6px 12px;">Text Size <span id="annotations-text-size-label"></span>:</div><button aria-label="Increase font size" type="button" class="annotations-text-size-plus btn btn-default" role="button"><i class="fa fa-plus" aria-hidden="true"></i></button><button aria-label="Decrease font size" type="button" class="annotations-text-size-minus btn btn-default" role="button"><i class="fa fa-minus" aria-hidden="true"></i></button>');
        jQuery(self.options.slot).find('.annotations-text-size-plus').click(function() {
            self.toggleTextSize(1);
        });
        jQuery(self.options.slot).find('.annotations-text-size-minus').click(function() {
            self.toggleTextSize(-1);
        });
    };

    $.FontResize.prototype.saving = function(annotation) {
        return annotation;
    };

     $.FontResize.prototype.toggleTextSize = function(step) {
        var self = this;
        step = isNaN(Number(step)) ? 0 : Number(step);

        var $content = jQuery(self.options.slot).find('.annotator-wrapper');
        var $label = jQuery("#annotations-text-size-label");
        var nodes = [], curnode, stylesize, styleunit, computed;
        var minsize = 8;
        var sizediff = 0;

        if(typeof this.defaultFontSize === "undefined") {
            this.defaultFontSize = 14;
        }
        if(typeof this.targetFontSize === "undefined") {
            this.targetFontSize = this.defaultFontSize;
        }

        this.targetFontSize += step;
        if(this.targetFontSize < minsize) {
            this.targetFontSize = minsize;
        }

        sizediff = this.targetFontSize - this.defaultFontSize;
        if(sizediff === 0) {
            $label.html("(default)");
            $content.css('fontSize', '');
        } else {
            $label.html("(" + (sizediff > 0 ? "+"+sizediff : sizediff) + ")");
            $content.css('fontSize', String(this.targetFontSize) + "px");
            nodes.push($content[0]);
        }

        // walk the dom and find custom fontStyle declarations and adust as necessary
        //console.log("updating font size to: ", this.targetFontSize, "step:", step);
        while(nodes.length > 0) {
            curnode = nodes.pop();
            // handle case where a <font> is embedded (deprecated tag... but still out there in the wild)
            if(curnode.tagName.toLowerCase() == 'font') {
                computed = window.getComputedStyle(curnode);
                curnode.style.fontSize = computed['font-size'];
                curnode.size = "";
            }
            // handle case where a class like "msoNormal" from an embedded stylesheet has applied a font size
            if(curnode != $content[0] && curnode.className != "") {
                curnode.style.fontSize = "inherit";
            }

            // handle case with an inline style fontSize (only adjust absolute fontSize values)
            stylesize = parseInt(curnode.style.fontSize, 10);
            if (!isNaN(stylesize)) {
                styleunit = curnode.style.fontSize.replace(stylesize, '');
                stylesize += step;
                stylesize = stylesize < minsize ? minsize : stylesize;
                if (styleunit.indexOf("px") !== -1 || styleunit.indexOf("pt") !== -1) {
                    curnode.style.fontSize = stylesize + styleunit;
                }
            }

            for(var i = curnode.children.length; i > 0; i--) {
                nodes.push(curnode.children[i-1]);
            }
        }
    };

    Object.defineProperty($.FontResize, 'name', {
        value: "FontResize"
    });


    $.plugins.push($.FontResize);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
