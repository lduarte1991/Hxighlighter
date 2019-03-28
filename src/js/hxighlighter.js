/**
 * Hxighlighter is the superclass that will contain all instances of the tool.
 * It will allow users to set up targets to annotate and then ways to annotate
 */

window.Hxighlighter = window.Hxighlighter || function(options) {
    
    // if no current instances, set up the dictionary
    if (!Hxighlighter.exists(Hxighlighter._instances)) {
        Hxighlighter._instances = {};
        Hxighlighter._instanceIDs = [];
    }

    // create a unique id for this instance
    var inst_id = options.inst_id;
    if (!Hxighlighter.exists(inst_id)) {
        if (Hxighlighter.exists(options.commonInfo.context_id) ||
            Hxighlighter.exists(options.commonInfo.collection_id) ||
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
 * Gets the unique identifier.
 * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * @return     {string} Unique identifier
 */
Hxighlighter.getUniqueId = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

/**
 * Function to determine if value exists or not
 *
 * @param      {Object}  obj     The object
 * @return     {boolean}  returns whether item exists or not
 */
Hxighlighter.exists = function(obj) {
    return typeof(obj) !== 'undefined';
};

/**
 * trims whitespace from strings
 *
 * @param      {string}  s       original string
 * @return     {string}  trimmed string
 */
Hxighlighter.trim = function(s) {
    if (typeof String.prototype.trim === 'function') {
        return String.prototype.trim.call(s);
    } else {
        return s.replace(/^[\s\xA0]+|[\s\xA0]+$/g, '');
    }
};

/**
 * Publishes Event to a specific instance, if no instanceID or '' is sent, the
 * event will be published to all instances
 *
 * @param      {string}  eventName   The event name
 * @param      {string}  instanceID  The instance id
 * @param      {array}  list        The list
 */
Hxighlighter.publishEvent = function(eventName, instanceID, list) {
    if (!Hxighlighter.exists(instanceID) || instanceID === "") {
        jQuery.each(Hxighlighter._instanceIDs, function(_, inst_id) {  
            // some of the events require the core to handle calling the components in a certain order
            if (Hxighlighter.requiredEvents.indexOf(eventName) >= 0) {
                Hxighlighter._instances[inst_id].core[eventName](list);
            }
            jQuery.publish(eventName + '.' + inst_id, list);
        });
    } else {
        // some of the events require the core to handle calling the components in a certain order
        if (Hxighlighter.requiredEvents.indexOf(eventName) >= 0) {
            Hxighlighter._instances[instanceID].core[eventName](list);
        }
        jQuery.publish(eventName+ '.' + instanceID, list);
    }
};

/**
 * Subscribes Event to a specific instance, if no instanceID or '' is sent, all
 * instances will be subscribed to event
 *
 * @param      {string}  eventName   The event name
 * @param      {string}  instanceID  The instance id
 * @param      {<type>}  callBack    The call back
 */
Hxighlighter.subscribeEvent = function(eventName, instanceID, callBack) {
    if (!Hxighlighter.exists(instanceID) || instanceID === "") {
        jQuery.each(Hxighlighter._instanceIDs, function(_, inst_id) {
            jQuery.subscribe(eventName + '.' + inst_id, callBack);
        });
    } else {
        jQuery.subscribe(eventName + '.' + instanceID, callBack);
    }
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

// comment out following line when not webpacking
export default Hxighlighter;
