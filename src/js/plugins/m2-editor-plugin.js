/**
 *  [[Skeleton]] Annotations Plugin
 *  
 *
 */

//uncomment to add css file
//require('./filaname.css');

(function($){
  $.SummernoteAnnotationBodyEditor = function(options) {

    jQuery.extend(this, {
      annotation: null,
      windowId: null,
      config: {
        plugins: '',
        toolbar: ''
      }
    }, options);

    this.init();
  };

  $.SummernoteAnnotationBodyEditor.prototype = {
    init: function() {
      var _this = this;
      var annoText = "",
        tags = [];

      this.editorMarkup = this.editorTemplate({
        annotation: _this.annotation,
        windowId : _this.windowId
      });
    },

    show: function(selector) {
      var _this = this;
      var annoText = "";
      var tags = [];
      this.editorContainer = jQuery(selector)
        .prepend(this.editorMarkup);
      
      window.jQuery(selector).closest('.ui-draggable').draggable({'handle': '.annotation-editor-nav-bar', 'containment': '.mirador-viewer'});

      this.selector = jQuery(selector);
      if (!jQuery.isEmptyObject(_this.annotation)) {
        if (jQuery.isArray(_this.annotation.resource)) {
          jQuery.each(_this.annotation.resource, function(index, value) {
            if (value['@type'] === "oa:Tag") {
              tags.push(value.chars);
            } else {
              annoText = value.chars;
            }
          });
        } else {
          annoText = _this.annotation.resource.chars;
        }
      }
      this.annotation.annotationText = annoText;
      window.jQuery('.annotation-editor-nav-bar .cancel').click(function() { setTimeout(function() { window.jQuery('.annotation-editor .button-container .cancel').click(); }, 250)});
      if (this.annotation.endpoint) {
        var hx_annotation = this.annotation.endpoint.getAnnotationInEndpoint(this.annotation);
        Hxighlighter.publishEvent('editorShown', '', [jQuery(selector), hx_annotation]);
      } else {
        Hxighlighter.publishEvent('editorShown', '', [jQuery(selector), this.annotation]);
      }
      jQuery('.button-container a').attr('tabindex', '0');
    },

    isDirty: function() {
      return false;
    },

    createAnnotation: function() {
      var resourceText = this.selector.find('#annotation-text-field').summernote('code');
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
      tags = Array.from(tags);

      var motivation = [],
        resource = [],
        on;

      if (tags && tags.length > 0) {
        motivation.push("oa:tagging");
        jQuery.each(tags, function(index, value) {
          resource.push({
            "@type": "oa:Tag",
            "chars": value
          });
        });
      }
      motivation.push("oa:commenting");
      resource.push({
        "@type": "dctypes:Text",
        "format": "text/html",
        "chars": resourceText
      });
      return {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@type": "oa:Annotation",
        "motivation": motivation,
        "resource": resource
      };
    },

    updateAnnotation: function(oaAnno) {
      var resourceText = this.selector.find('#annotation-text-field').summernote('code');
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
      tags = Array.from(tags);

      var motivation = [],
        resource = [];

      //remove all tag-related content in annotation
      oaAnno.motivation = jQuery.grep(oaAnno.motivation, function(value) {
        return value !== "oa:tagging";
      });
      oaAnno.resource = jQuery.grep(oaAnno.resource, function(value) {
        return value["@type"] !== "oa:Tag";
      });
      //re-add tagging if we have them
      if (tags.length > 0) {
        oaAnno.motivation.push("oa:tagging");
        jQuery.each(tags, function(index, value) {
          oaAnno.resource.push({
            "@type": "oa:Tag",
            "chars": value
          });
        });
      }
      jQuery.each(oaAnno.resource, function(index, value) {
        if (value["@type"] === "dctypes:Text") {
          value.chars = resourceText;
        }
      });
    },

    editorTemplate: $.Handlebars.compile([
      '<nav class="annotation-editor-nav-bar"><a tabindex="0" href="#cancel" class="cancel"><i class="fa fa-times-circle-o fa-fw"></i></a></nav>',
      '<textarea id="annotation-text-field"></textarea>',
      '<div class="plugin-area"></div>'
    ].join(''))
  };
}(Mirador));
