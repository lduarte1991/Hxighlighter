const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.Node = dom.window.Node;
global.XPathResult = dom.window.XPathResult;
global.MutationObserver = dom.window.MutationObserver;

var jQuery = require('jquery');
global.jQuery = jQuery;
global.$ = jQuery;
