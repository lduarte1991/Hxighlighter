/**
 * Hxighlighter is the superclass that will contain all instances of the tool.
 * It will allow users to set up targets to annotate and then ways to annotate
 */

import '../css/common.css';

/* istanbul ignore next */
var root = global || window;
root.Hxighlighter = root.Hxighlighter || function(options) {

    if (!options) {
        return;
    }
    
    // if no current instances, set up the dictionary
    if (!Hxighlighter.exists(Hxighlighter._instances)) {
        Hxighlighter._instances = {};
        Hxighlighter._instanceIDs = [];
    }

    // create a unique id for this instance
    var inst_id = options.inst_id;
    if (!Hxighlighter.exists(inst_id)) {
        if (Hxighlighter.exists(options.commonInfo.context_id) &&
            Hxighlighter.exists(options.commonInfo.collection_id) &&
            Hxighlighter.exists(options.commonInfo.object_id)) {
            inst_id = options.commonInfo.context_id + ':' + options.commonInfo.collection_id + ':' + options.commonInfo.object_id
        } else {
            inst_id = Hxighlighter.getUniqueId();
        }
    }

    // save the new instance by its id
    Hxighlighter._instances[inst_id] = {
        'id': inst_id
    };

    // id gets pushed to list as well
    Hxighlighter._instanceIDs.push(inst_id);

    // set up the actual instance of Hxighlighter
    Hxighlighter._instances[inst_id].core = new Hxighlighter.Core(options, inst_id);
};

/**
 * List of Required Sequential Events (RSEs)
 */
Hxighlighter.requiredEvents = [
    // all components should deal with being enabled/disabled
    "ComponentEnable",
    "ComponentDisable",

    // targets should be sure that they have a way to make selection and show/hide annotations
    "TargetSelectionMade",
    "TargetAnnotationDraw",
    "TargetAnnotationUndraw",

    // viewers should handle a way to 1) make annotations and 2) display the text
    "ViewerEditorOpen",
    "ViewerEditorClose",
    "ViewerDisplayOpen",
    "ViewerDisplayClose",

    // storage should handle keeping track of the annotations made
    "StorageAnnotationSave",
    "StorageAnnotationLoad",
    "StorageAnnotationEdit",
    "StorageAnnotationDelete",

    // though replies are not mandatory, they are annotations and should be treated similarly
    // the line below can be commented out should it not be relevant to your usecase.
    "StorageAnnotationGetReplies",
];

/**
 * selectors will populate this array for target controllers to retrieve when
 * they are loaded on the page
 */
Hxighlighter.selectors = [];
Hxighlighter.drawers = [];
Hxighlighter.viewers = [];
Hxighlighter.plugins = [];
Hxighlighter.storage = [];

// comment out following line when not webpacking
export default Hxighlighter;
