(function($$) {
  /**
     * Gets the current top/left position for an event relative to the
     * Hxighlighter container (or the document body in full-page mode).
     * Handles both mouse and keyboard selection events.
     *
     * @param      {Event}   event   The DOM event (mouse or keyboard)
     * @return     {Object}  {top: number, left: number}
     */
  $$.mouseFixedPosition = function(event) {
    var container = Hxighlighter.getContainer(event.target);
    var offset = {top: 0, left: 0};

    if (container) {
      var containerRect = container.getBoundingClientRect();
      // pageX/Y are document-relative; containerRect is viewport-relative.
      // Convert containerRect to document-relative by adding window scroll.
      offset = {
        top: containerRect.top + window.scrollY - container.scrollTop,
        left: containerRect.left + window.scrollX - container.scrollLeft
      };
    } else {
      var body = window.document.body;
      if (jQuery(body).css('position') !== "static") {
        offset = jQuery(body).offset();
      }
    }

    try {
      var top = event.pageY - offset.top;
      var left = event.pageX - offset.left;
      // in case user is selecting via keyboard, this sets the adder to top-left corner
      if (event.type.indexOf("mouse") === -1 && event.type.indexOf('key') > -1) {
        var boundingBox = window.getSelection().getRangeAt(0).getBoundingClientRect();
        if (container) {
          var containerRect2 = container.getBoundingClientRect();
          // boundingBox is viewport-relative; convert to container-relative
          top = boundingBox.top - containerRect2.top + container.scrollTop + boundingBox.height;
          left = boundingBox.left - containerRect2.left + container.scrollLeft + boundingBox.width;
        } else {
          top = boundingBox.top - offset.top + boundingBox.height;
          left = boundingBox.left - offset.left + boundingBox.width;
        }
      }
      return {
        top: top,
        left: left
      };
    } catch (e) {
      return $$.mouseFixedPositionFromRange(event);
    }
  };

  /**
     * Extracts top/left coordinates from a bounding box or similar object.
     * Returns {top: 0, left: 0} when properties are missing or falsy.
     *
     * @param      {Object}  boundingBox  Object with top and left properties
     * @return     {Object}  {top: number, left: number}
     */
  $$.mouseFixedPositionFromRange = function(boundingBox) {
    return {
      top: boundingBox.top || 0,
      left: boundingBox.left || 0
    };
  };

  /**
     * Extracts quoted text from an array of range/highlight objects.
     *
     * @param      {Array}   ranges  Array of range objects (with .text(), .toString(), or .exact)
     * @return     {Object}  {exact: string[], exactNoHtml: string[]}
     */
  $$.getQuoteFromHighlights = function(ranges) {
    var allText = [];
    var exactText = [];
    for (var i = 0, len = ranges.length; i < len; i++) {
      var text = [];
      var r = ranges[i];
      try {
        text.push(Hxighlighter.trim(r.text()));
      } catch (e) {
        text.push(Hxighlighter.trim(r.toString()));
        if (r.toString() === "[object Object]") {
          text.pop();
          text.push(r.exact);
        }
      }

      var exact = text.join(' / ').replace(/[\n\r]/g, '<br>');
      exactText.push(exact);
      allText = allText.concat(text);
    }
    return {
      'exact': exactText,
      'exactNoHtml': allText
    };
  };

  /**
     * Gets the unique identifier.
     * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * @return     {string} Unique identifier
     */
  $$.getUniqueId = function() {
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
  $$.exists = function(obj) {
    return typeof(obj) !== 'undefined';
  };

  /**
     * Trims whitespace from strings. Returns empty string for null/undefined.
     *
     * @param      {*}       s       value to trim (coerced to string)
     * @return     {string}  trimmed string
     */
  $$.trim = function(s) {
    if (s == null) return '';
    s = String(s);
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
  $$.publishEvent = function(eventName, instanceID, list) {
    if (!$$.exists(instanceID) || instanceID === "") {
      // WARNING: If events aren't properly sent/received, check pub/sub functions are encoding object id in base64
      jQuery.each($$._instanceIDs, function(_, inst_id) {
        // some of the events require the core to handle calling the components in a certain order
        if ($$.requiredEvents.indexOf(eventName) >= 0) {
          $$._instances[inst_id].core[eventName](list);
        }
        jQuery.publish(eventName + '.' + inst_id, list);
      });
    } else {
      // some of the events require the core to handle calling the components in a certain order
      if ($$.requiredEvents.indexOf(eventName) >= 0) {
        $$._instances[instanceID].core[eventName](list);
      }
      jQuery.publish(eventName + '.' + instanceID, list);
    }
  };

  /**
     * Subscribes Event to a specific instance, if no instanceID or '' is sent, all
     * instances will be subscribed to event
     *
     * @param      {string}  eventName   The event name
     * @param      {string}  instanceID  The instance id
     * @param      {Function}  callBack    The callback function
     */
  $$.subscribeEvent = function(eventName, instanceID, callBack) {
    if (!$$.exists(instanceID) || instanceID === "") {
      jQuery.each($$._instanceIDs, function(_, inst_id) {
        jQuery.subscribe(eventName + '.' + inst_id, callBack);
      });
    } else {
      jQuery.subscribe(eventName + '.' + instanceID, callBack);
    }
  };

  /**
     * Stops event propagation and prevents default behavior.
     *
     * @param      {Event}   e   The DOM event to cancel
     * @return     {boolean} Always returns false
     */
  $$.pauseEvent = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    e.cancelBubble = true;
    e.returnValue = false;
    return false;
  };

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));