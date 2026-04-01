/**
 * micro-template.js
 * 
 * A small template engine that is compatible with lodash/underscore's
 * _.template() syntax. This was created to replace the full lodash library
 * (~530 KB) since we only used _.template() and _.each() from it.
 *
 * Supported template tags (same as lodash/underscore):
 *   <%= expression %>   Interpolate: inserts the value as-is (no escaping)
 *   <%- expression %>   Escape: inserts the value with HTML entities escaped
 *   <% code %>          Evaluate: runs arbitrary JavaScript (loops, conditionals, etc.)
 *
 * Usage:
 *   var compiled = _.template('<h1><%= title %></h1>');
 *   var html = compiled({ title: 'Hello World' });
 *   // => '<h1>Hello World</h1>'
 *
 * The _.each() helper is also available inside templates for iterating over
 * arrays or objects, matching the lodash/underscore convention used in this
 * project's HTML templates.
 *
 * This file sets window._.template and window._.each so it can be used as a
 * drop-in replacement anywhere lodash was previously referenced via the
 * webpack ProvidePlugin.
 */
(function (root) {

    // -----------------------------------------------------------------
    // HTML escaping
    // -----------------------------------------------------------------

    /**
     * Maps special characters to their HTML entity equivalents.
     * Used by the <%- expr %> (escape) tag to prevent XSS.
     */
    var htmlEntityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#96;',
        '=': '&#x3D;'
    };

    /**
     * Escapes a string so it is safe to insert into HTML.
     * Example: escapeHtml('<b>hi</b>') => '&lt;b&gt;hi&lt;/b&gt;'
     */
    function escapeHtml(string) {
        return String(string).replace(/[&<>"'`=\/]/g, function (character) {
            return htmlEntityMap[character];
        });
    }

    // -----------------------------------------------------------------
    // Template compiler
    // -----------------------------------------------------------------

    /**
     * Compiles a template string into a reusable function.
     *
     * How it works:
     * 1. The template string is scanned for <% %>, <%= %>, and <%- %> tags.
     * 2. Each tag is converted into JavaScript string-building code.
     * 3. A new Function is created from that generated code.
     * 4. The returned function accepts a data object and returns the
     *    rendered HTML string.
     *
     * @param {string} templateString - The raw template markup.
     * @returns {function} A compiled function that accepts a data object.
     */
    function compileTemplate(templateString) {

        // Escape backslashes and single quotes in the template so they
        // don't break the generated function's string literals.
        var sanitized = templateString
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");

        // Replace <%- expr %> (escape) tags first so they aren't caught
        // by the general <% %> pattern. The replacement outputs code that
        // evaluates the expression, and if it's not null/undefined, passes
        // it through escapeHtml.
        sanitized = sanitized.replace(/<%-([\s\S]+?)%>/g, function (match, expression) {
            return "' +\n((__temp = (" + expression + ")) == null ? '' : __escape(__temp)) +\n'";
        });

        // Replace <%= expr %> (interpolate) tags. Similar to above but
        // inserts the value directly without HTML escaping.
        sanitized = sanitized.replace(/<%= *([\s\S]+?)%>/g, function (match, expression) {
            return "' +\n((__temp = (" + expression + ")) == null ? '' : __temp) +\n'";
        });

        // Replace <% code %> (evaluate) tags. These contain raw JavaScript
        // (e.g. for-loops, if-statements) that run during rendering.
        sanitized = sanitized.replace(/<%([\s\S]+?)%>/g, function (match, code) {
            return "';\n" + code + "\n__output += '";
        });

        // Escape literal newlines so they become \n inside the string.
        sanitized = sanitized.replace(/\n/g, '\\n');

        // Build the function body. The generated function receives two
        // arguments: `obj` (the data) and `_` (a helpers object with
        // `each` and `escape`).
        //
        // `with(obj || {})` lets template expressions reference data
        // properties without a prefix (e.g. `<%= title %>` instead of
        // `<%= obj.title %>`).
        var functionBody =
            "var __temp, __output = '';\n" +
            "var __escape = _.escape;\n" +
            "with (obj || {}) {\n" +
            "  __output += '" + sanitized + "';\n" +
            "}\n" +
            "return __output;\n";

        // Create the compiled render function.
        // Using `new Function` is standard practice for template engines
        // (lodash, underscore, Handlebars all do this).
        var renderFunction = new Function('obj', '_', functionBody);

        // Return a closure that calls the render function with the
        // provided data and our helper utilities.
        return function (data) {
            var helpers = {
                each: each,
                escape: escapeHtml
            };
            return renderFunction.call(data, data, helpers);
        };
    }

    // -----------------------------------------------------------------
    // each() helper
    // -----------------------------------------------------------------

    /**
     * Iterates over an array or object, calling the callback for each item.
     * Works like lodash's _.each() / _.forEach().
     *
     * For arrays:  callback(value, index, collection)
     * For objects: callback(value, key, collection)
     *
     * @param {Array|Object} collection - The collection to iterate over.
     * @param {function} callback - Called for each item.
     */
    function each(collection, callback) {
        if (Array.isArray(collection)) {
            for (var i = 0; i < collection.length; i++) {
                callback(collection[i], i, collection);
            }
        } else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            for (var k = 0; k < keys.length; k++) {
                callback(collection[keys[k]], keys[k], collection);
            }
        }
    }

    // -----------------------------------------------------------------
    // Expose as window._.template and window._.each
    // -----------------------------------------------------------------

    root._ = root._ || {};
    root._.template = compileTemplate;
    root._.each = each;
    root._.escape = escapeHtml;

})(typeof window !== 'undefined' ? window : global);
