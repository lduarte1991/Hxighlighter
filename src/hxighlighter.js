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
            Hxighlighter.exists(options.commonInfo.collection_id)||
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
    Hxighlighter._instanceIDs.push(inst_id);

    if (Hxighlighter.exists(options.targetOptions)) {
        var tOptions = jQuery.extend({}, options.targetOptions, options.commonInfo);
        Hxighlighter._instances[inst_id].targetController = new Hxighlighter.Target(tOptions, inst_id);
    }

    if (Hxighlighter.exists(options.coreOptions)) {
        var cOptions = jQuery.extend({}, options.coreOptions, options.commonInfo);
        Hxighlighter._instances[inst_id].core = new Hxighlighter.Core(cOptions, inst_id);
    }
};

/**
 * Gets the unique identifier.
 * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * @return     {string} { Unique identifier }
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
 * Publishes Event to a specific instance, if no instanceID or '' is sent, the
 * event will be published to all instances
 *
 * @param      {string}  eventName   The event name
 * @param      {string}  instanceID  The instance id
 * @param      {<type>}  list        The list
 */
Hxighlighter.publishEvent = function(eventName, instanceID, list) {
    if (!Hxighlighter.exists(instanceID) || instanceID === "") {
        jQuery.each(Hxighlighter._instanceIDs, function(_, inst_id) {
            jQuery.publish(eventName + '.' + inst_id, list);
        });
    } else {
        jQuery.publish(eventName + '.' + instanceID, list);
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
 * Function to determine if value exists or not
 *
 * @param      {<type>}  obj     The object
 * @return     {boolean}  returns whether item exists or not
 */
Hxighlighter.exists = function(obj) {
    return typeof(obj) !== 'undefined';
};

/**
 * keeps watch on if an HTML element has changed and triggers
 * a callback when it does happen
 *
 * @param      {string}            selector  The selector
 * @param      {Function}          callback  The callback
 * @return     {MutationObserver}  observer object
 */
Hxighlighter.watchForChange = function(selector, callback) {
    var observer = new MutationObserver(callback);
    observer.observe(jQuery(selector)[0], {
        'subtree': true,
        'childList': true
    });
    return observer;
};

/**
 * Prevents event from propagating outwards from a call
 *
 * @param      {<type>}   e      event
 * @return     {boolean}  must return false to have it stop propagation
 */
Hxighlighter.pauseEvent = function(e){
    if(e.stopPropagation) e.stopPropagation();
    if(e.preventDefault) e.preventDefault();
    e.cancelBubble=true;
    e.returnValue=false;
    return false;
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
