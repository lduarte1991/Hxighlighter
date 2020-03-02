/**
 *  HxPermissions Annotations Plugin
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
    $.HxPermissions = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        return this;
    };

    /**
     * Initializes instance
     */
    $.HxPermissions.prototype.init = function() {
        var self = this;
    };

    $.HxPermissions.prototype.saving = function(annotation) {
        return annotation;
    };

    $.HxPermissions.prototype.editorShown = function(editor, annotation) {
        // console.log(annotation.permissions, self.options.user_id, editor);
    };

    $.HxPermissions.prototype.displayShown = function(display, annotation) {
        var self = this;
        if (Array.isArray(annotation)) {
            annotation.forEach(function(ann) {
                self.removeWithoutPermission(ann, display);
            });
        } else {
            self.removeWithoutPermission(annotation, display);
        }
        // console.log(annotation.permissions, self.options.user_id, display);
    };

    $.HxPermissions.prototype.removeWithoutPermission = function(ann, loc) {
        var self = this;
        if (!ann.permissions) {
            // either permissions are not turned on or the annotation is fresh and person must have just made it.
            return;
        }
        // hide edit if the person does not have can_update permissions
        if (!self.options.has_staff_permissions && self.options.instructors.indexOf(self.options.user_id) == -1 && ann.permissions.can_update.indexOf(self.options.user_id) == -1) {
            loc.find('#edit-' + ann.id).remove();  
        }
        // hide delete if the person does not have can_delete permissions
        if (!self.options.has_staff_permissions && self.options.instructors.indexOf(self.options.user_id) == -1 && ann.permissions.can_delete.indexOf(self.options.user_id) == -1) {
            loc.find('#delete-' + ann.id).remove();  
        }
    }

    Object.defineProperty($.HxPermissions, 'name', {
        value: "HxPermissions"
    });


    $.plugins.push($.HxPermissions);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
