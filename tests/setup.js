// Test setup: make jQuery available globally before any modules that need it
// (e.g. jquery-tiny-pubsub.js reads jQuery at module scope)
var jQuery = require('jquery');
var root = global || window;
root.jQuery = jQuery;
root.$ = jQuery;
