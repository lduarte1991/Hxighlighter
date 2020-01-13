/**
 * 
 */

(function($) {
    /**
     * Sets up components for Hxighlighte Core isntance
     *
     * @class      Core (name)
     * @param      {Object}  options  The options
     * @param      {string}  inst_id  The instance identifier
     */
    $.Core = function(options, inst_id) {

        // options and instance ids are saved
        this.options = options;
        this.instance_id = inst_id;

        // keeps track of viewer/plugin modules for UI
        this.viewers = [];
        this.disabledViewers = [];
        this.plugins = [];
        this.disabledPlugins = [];

        // keeps track of annotations and storage modules for backend
        this.annotations = [];
        this.storage = [];
        this.disabledStorage = [];

        // keeps track of object(s) being annotated
        this.targets = [];

        // initializes tool
        this.init();
    };

    /**
     * initializer of core and its components
     */
    $.Core.prototype.init = function() {
        this.setUpTargets();
        this.setUpViewers();
        // this.setUpListeners();
        //this.setUpStorage();
        // this.setUpPlugins();
    };

    /**
     * sets up targets to be annotated
     */
    $.Core.prototype.setUpTargets = function() {
        var targets = this.options.targets;

        for (var i = 0; i < targets.length; i++) {
            var mediaType = $.Core._capitalizeMedia(targets[i].mediaType) + "Target";
            if (typeof Hxighlighter[mediaType] === "function") {
                this.targets.push(new Hxighlighter[mediaType](jQuery.extend({}, targets[i], this.options.commonInfo), this.instance_id));
            }
        }
    };

    $.Core.prototype.setUpViewers = function() {

    };

    $.Core.prototype.TargetSelectionMade = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'TargetSelectionMade', [message[1], message[2]]);
    };

    $.Core.prototype.TargetAnnotationDraw = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'TargetAnnotationDraw', message);
    };

    $.Core.prototype.ViewerEditorOpen = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'ViewerEditorOpen', message);
    };

    $.Core.prototype.ViewerDisplayOpen = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'ViewerDisplayOpen', message);
    };

    $.Core.prototype.ViewerEditorClose = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'ViewerEditorClose', message);
    };

    $.Core.prototype.ViewerDisplayClose = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'ViewerDisplayClose', message);
    };

    $.Core.prototype.StorageAnnotationSave = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'StorageAnnotationSave', message);
    };

    $.Core.prototype.StorageAnnotationUpdate = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'StorageAnnotationUpdate', message);
    };

    $.Core.prototype.StorageAnnotationDelete = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'StorageAnnotationDelete', message);
    };

    $.Core.prototype.StorageAnnotationLoad = function(message) {
        var self = this;
        self.callFuncInList(this.targets, 'StorageAnnotationLoad', message);
    };

    // $.Core.prototype.StorageAnnotationGetReplies = function(message) {
    //     var self = this;
    //     self.callFuncInList(this.targets, 'StorageAnnotationGetReplies', message);
    // };

    $.Core.prototype.StorageAnnotationSearch = function(message) {
        var self = this;
        //console.log('Received here');
        self.callFuncInList(this.targets, 'StorageAnnotationSearch', message);
    }

    // Util functions

    $.Core.prototype.callFuncInList = function(objectList, funcName, params) {
        var self = this;
        jQuery.each(objectList, function(_, component) {
            if (typeof component[funcName] === "function") {
                component[funcName].apply(component, params)
            }
        });
    };

    $.Core._capitalizeMedia = function(media) {
        var editedMedia = Hxighlighter.trim(media);
        editedMedia = editedMedia.toLowerCase();
        return editedMedia.charAt(0).toUpperCase() + editedMedia.slice(1);
    }

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
