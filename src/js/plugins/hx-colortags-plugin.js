/**
 *  Color (Predetermined) Tags Plugin
 *  
 *  Will create an area for inputting tags, just a textfield, no color
 *
 */

require('./hx-colortags-plugin.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.ColorTags = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.init();
        this.name;
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.ColorTags.prototype.init = function() {
        var self = this;
        self.name = 'ColorTags';
        self.annotationListeners()
    };


    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.ColorTags.prototype.returnValue = function() {
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.ColorTags.prototype.annotationListeners = function() {
        var self = this;

        $.subscribeEvent('annotationLoaded', self.instanceID, function(_, ann) {
            // console.log('hello', ann.tags);
            if (typeof(ann.tags) !== 'undefined' && ann.tags.length > 0) {
                var color = self.getColorFromValue(ann.tags[ann.tags.length - 1]);
                if (typeof(color) !== "undefined") {
                    setTimeout(function() {$.publishEvent('changeDrawnColor', self.instanceID, [ann, color]);}, 250);
                }
            };
        });
        $.subscribeEvent('drawList', self.instanceID, function(_, anns) {
            anns.forEach(function(ann) {
                // console.log('hello', ann.tags);
                if (typeof(ann.tags) !== 'undefined' && ann.tags.length > 0) {
                    var color = self.getColorFromValue(ann.tags[ann.tags.length - 1]);
                    if (typeof(color) !== "undefined") {
                        setTimeout(function() {$.publishEvent('changeDrawnColor', self.instanceID, [ann, color]);}, 250);
                    }
                }
            });
        });

        $.subscribeEvent('changeColorOfElement', self.instanceID, function(_, tag, callBack) {
            var colorFound = self.getColorFromValue(tag);
            if (colorFound) {
                colorFound = self.RGBaToHex(colorFound);
            }
            callBack(colorFound);
        });

    };

    $.ColorTags.prototype.getColorFromValue = function(value) {
        var self = this;
        if ('allTags' in self.options) {
            var rgbaColor = self.hexToRGBa(self.options.allTags);
            var rgbaVal = 'rgba(' + rgbaColor.join(',') + ')';
            return rgbaVal;
        }
        if (value in self.options) {
            var rgbaColor = self.hexToRGBa(self.options[value]);
            var rgbaVal = 'rgba(' + rgbaColor.join(',') + ')';
            return rgbaVal;
        }
        return undefined;
    };

    /* Following function taken from
     * https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
     */
    $.ColorTags.prototype.hexToRGBa = function(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
            0.3
        ] : null;
    };


    /**
     * Following function taken from
     * https://css-tricks.com/converting-color-spaces-in-javascript/
     */
    $.ColorTags.prototype.RGBaToHex = function(rgb){
        // Choose correct separator
        let sep = rgb.indexOf(",") > -1 ? "," : " ";
        // Turn "rgb(r,g,b)" into [r,g,b]
        rgb = rgb.substr(5).split(")")[0].split(sep);

        let r = (+rgb[0]).toString(16),
            g = (+rgb[1]).toString(16),
            b = (+rgb[2]).toString(16);

        if (r.length == 1)
        r = "0" + r;
        if (g.length == 1)
        g = "0" + g;
        if (b.length == 1)
        b = "0" + b;

        return "#" + r + g + b;
    }

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.ColorTags.prototype.saving = function(annotation) {
        var self = this;
        if (typeof(annotation.tags) !== 'undefined' && annotation.tags.length > 0) {
            var color = self.getColorFromValue(annotation.tags[annotation.tags.length - 1]);
            if (typeof(color) !== "undefined") {
                setTimeout(function() {$.publishEvent('changeDrawnColor', self.instanceID, [annotation, color]);}, 250);
            }
        }
        return annotation;
    };

    /**
     * Code that runs once the editor is shown on screen.
     *
     * @param      {Annotation}  annotation  The annotation in case the user is editing and we need the text
     * @param      {HTMLElement}  editor      The editor element
     */
    $.ColorTags.prototype.editorShown = function(editor, annotation) {
        var self = this;
        // console.log('ColorTags editorShown');
        var listNode = editor.find('.token-input-list-facebook')[0];
        if (listNode && listNode.addEventListener) {
            listNode.addEventListener('DOMNodeInserted', function(event) {
                if (event.target.className === "token-input-token-facebook") {
                    var color = self.getColorFromValue(jQuery(event.target).find('p').text().trim());
                    if (typeof (color) !== "undefined") {
                        jQuery(event.target).css('background', color);
                    }
                }
            }, false);
        }
        jQuery.each(jQuery(listNode).find('.token-input-token-facebook p'), function(_, el) {
            var tag = jQuery(el).text();
            var color = self.getColorFromValue(tag);
            if (typeof(color) !== "undefined") {
                jQuery(el).parent().css('background', color);
            }
        });
    };

    $.ColorTags.prototype.displayShown = function(viewer, annotation) {
        var self = this;
        jQuery.each(jQuery(viewer).find('.annotation-tag'), function(_, el) {
            var tag = jQuery(el).text().trim();
            var color = self.getColorFromValue(tag);
            if (typeof(color) !== "undefined") {
                jQuery(el).css('background', color);
            }
        });
    };

    Object.defineProperty($.ColorTags, 'name', {
        value: "ColorTags"
    });

    $.plugins.push($.ColorTags);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
