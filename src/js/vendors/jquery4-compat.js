/**
 * jQuery 4 Compatibility Shim
 *
 * Restores deprecated jQuery APIs that were removed in jQuery 4.0.
 * Required by third-party libraries (jquery-confirm, timeago, jquery.tokeninput)
 * that still reference these methods.
 *
 * Also manually initializes jquery-confirm, whose CommonJS wrapper exports
 * a factory function instead of auto-executing with jQuery 4.
 *
 * Can be removed once all third-party deps are updated for jQuery 4.
 */

var jQuery = require('jquery');

if (!jQuery.isArray) {
    jQuery.isArray = Array.isArray;
}

if (!jQuery.isFunction) {
    jQuery.isFunction = function (obj) {
        return typeof obj === 'function';
    };
}

if (!jQuery.trim) {
    jQuery.trim = function (str) {
        return str == null ? '' : (str + '').trim();
    };
}

if (!jQuery.now) {
    jQuery.now = Date.now;
}

// jquery-confirm's CommonJS branch exports a factory function rather than
// auto-executing. We must call it with jQuery to register $.fn.confirm.
var jconfirmFactory = require('jquery-confirm');
if (typeof jconfirmFactory === 'function' && !jQuery.fn.confirm) {
    jconfirmFactory(window, jQuery);
}
