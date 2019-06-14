/**
 *  [[Skeleton]] Annotations Plugin
 *  
 *
 */

//uncomment to add css file
//require('./filaname.css');

(function($){

    /**
     * @constructor
     * @params {Object} options - specific options for this plugin
     */
    $.[[Skeleton]] = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.[[Skeleton]].prototype.init = function() {
        var self = this;
    };

    $.[[Skeleton]].prototype.saving = function(annotation) {
        return annotation;
    };

    Object.defineProperty($.[[Skeleton]], 'name', {
        value: "[[Skeleton]]"
    });


    $.plugins.push($.[[Skeleton]]);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
