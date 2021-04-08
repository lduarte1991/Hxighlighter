/**
 *  Dropdown (Predetermined) Tags Plugin
 *  
 *  Will create an area for inputting tags, just a textfield, no color
 *
 */

require('./hx-simpletags-plugin.js');
require('./hx-simpletags-plugin.css');
require('jquery-tokeninput/styles/token-input-facebook.css');
require('jquery-tokeninput/build/jquery.tokeninput.min.js');
require('./hx-dropdowntags-plugin.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.DropdownTags = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.init();
        this.name;
        this.instanceID = instanceID;
        return this;
    };

    /**
     * Initializes instance
     */
    $.DropdownTags.prototype.init = function() {
        var self = this;
        self.name = 'DropdownTags';
        self.annotationListeners();
        var tags = ('tags' in self.options) ? self.options.tags : [];
        // jQuery.each(tags, function(_, tag) {
        //   jQuery('#tag-list-options').append('<option value="' + tag + '" />');
        // });
        jQuery('.search-bar select').on('change', function() {
          if (jQuery(this).val() == "Tag") {
            jQuery.each(tags, function(_, tag) {
              jQuery('#tag-list-options').append('<option value="' + tag + '" />');
            });
          } else {
            jQuery('#tag-list-options').html('');
          }
        });
    };


    /**
     * Returns the HTML value of the WYSIWYG. 
     *
     * @return     {String}  HTML value found in the WYSIWYG
     */
    $.DropdownTags.prototype.returnValue = function() {
        var self = this;
        var tags = jQuery('.token-input-token-facebook p').map(function(_, token) {
            return jQuery(token).html();
        });
        // Thanks to https://stackoverflow.com/questions/36810940/array-from-on-the-internet-explorer
        if (!Array.from) {
          Array.from = (function () {
            var toStr = Object.prototype.toString;
            var isCallable = function (fn) {
              return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
            };
            var toInteger = function (value) {
              var number = Number(value);
              if (isNaN(number)) { return 0; }
              if (number === 0 || !isFinite(number)) { return number; }
              return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
            };
            var maxSafeInteger = Math.pow(2, 53) - 1;
            var toLength = function (value) {
              var len = toInteger(value);
              return Math.min(Math.max(len, 0), maxSafeInteger);
            };

            // The length property of the from method is 1.
            return function from(arrayLike/*, mapFn, thisArg */) {
              // 1. Let C be the this value.
              var C = this;

              // 2. Let items be ToObject(arrayLike).
              var items = Object(arrayLike);

              // 3. ReturnIfAbrupt(items).
              if (arrayLike == null) {
                throw new TypeError("Array.from requires an array-like object - not null or undefined");
              }

              // 4. If mapfn is undefined, then let mapping be false.
              var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
              var T;
              if (typeof mapFn !== 'undefined') {
                // 5. else
                // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                if (!isCallable(mapFn)) {
                  throw new TypeError('Array.from: when provided, the second argument must be a function');
                }

                // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
                if (arguments.length > 2) {
                  T = arguments[2];
                }
              }

              // 10. Let lenValue be Get(items, "length").
              // 11. Let len be ToLength(lenValue).
              var len = toLength(items.length);

              // 13. If IsConstructor(C) is true, then
              // 13. a. Let A be the result of calling the [[Construct]] internal method of C with an argument list containing the single item len.
              // 14. a. Else, Let A be ArrayCreate(len).
              var A = isCallable(C) ? Object(new C(len)) : new Array(len);

              // 16. Let k be 0.
              var k = 0;
              // 17. Repeat, while k < len… (also steps a - h)
              var kValue;
              while (k < len) {
                kValue = items[k];
                if (mapFn) {
                  A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                } else {
                  A[k] = kValue;
                }
                k += 1;
              }
              // 18. Let putStatus be Put(A, "length", len, true).
              A.length = len;
              // 20. Return A.
              return A;
            };
          }());
        }
        return Array.from(tags);
    };


    // Annotation specific functions

    /**
     * Turns on the specific listeners when the plug in is initiated.
     */
    $.DropdownTags.prototype.annotationListeners = function() {
        var self = this;
        $.subscribeEvent('editorHidden', self.instanceID, function(){
            self.destroy();
        }.bind(this));
    };

    /**
     * Code to run just before the annotation is saved to storage
     *
     * @param      {Annotation}  annotation  The annotation as it currently is saved.
     * @return     {Annotation}  The annotation with the contents of the WYSIWYG inserted.
     */
    $.DropdownTags.prototype.saving = function(annotation) {
        var self = this;
        annotation.tags = self.returnValue() || [];
        return annotation;
    };

    /**
     * Code that runs once the editor is shown on screen.
     *
     * @param      {Annotation}  annotation  The annotation in case the user is editing and we need the text
     * @param      {HTMLElement}  editor      The editor element
     */
    $.DropdownTags.prototype.editorShown = function(editor, annotation) {
        // console.log('DropdownTags editorShown');
        var self = this;
        editor.find('#tag-list').addClass('token-tag-field');
        self.field = editor.find('.token-tag-field');

        var tags = ('tags' in self.options) ? self.options.tags : [];
        var hintText = tags.length > 0 ? '(e.g., ' + tags.join(', ') + ')' : '' 
        var preDTags = [];
        tags.forEach(function(tag) {
            preDTags.push({
                name: tag,
                id: tag
            })
        });
        self.field.tokenInput(preDTags, {
            theme: 'facebook',
            preventDuplicates: true,
            allowTabOut: true,
            hintText: 'Add a tag...' + hintText,
            placeholder: 'Add tags. Separate multiple by using "Enter".',
            allowFreeTagging: ('folksonomy' in self.options) ? self.options.folksonomy : false,
            noResultsText: "Not Found. Hit ENTER to add a personal tag.",
        });
        jQuery('#token-input-tag-list').attr('aria-label', 'Add tags. Separate multiple by using "Enter".');
        // jQuery('#token-input-tag-list').attr('placeholder', 'Tag:');
        if (annotation.tags && annotation.tags.length > 0) {
            annotation.tags.forEach(function(tag) {
                self.field.tokenInput('add', {
                    'name': tag,
                    'id': tag,
                });
            });
        }
    };

    $.DropdownTags.prototype.destroy = function() {
        var self = this;
        self.field.tokenInput('destroy');
        jQuery('.token-input-dropdown-facebook').remove();
    };

    Object.defineProperty($.DropdownTags, 'name', {
        value: "DropdownTags"
    });

    $.plugins.push($.DropdownTags);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
