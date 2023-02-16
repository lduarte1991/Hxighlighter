(function($$) {
    /**
     * Gets the current top/left position for an event (in particular your mouse pointer)
     *
     * @param      {Object}  event   The event
     * @return     {Object}  { description_of_the_return_value }
     */
    $$.mouseFixedPosition = function(event, annotation) {
        var body = window.document.body;
        var offset = {top: 0, left: 0};

        if (jQuery(body).css('position') !== "static") {
            offset = jQuery(body).offset();
        }

        try {
            var top = event.pageY - offset.top;
            var left = event.pageX - offset.left;
            // in case user is selecting via keyboard, this sets the adder to top-left corner
            if (event.type.indexOf("mouse") === -1 && event.type.indexOf('key') > -1) {
                var boundingBox = window.getSelection().getRangeAt(0).getBoundingClientRect();
                top = boundingBox.top - offset.top + boundingBox.height;
                left = boundingBox.left - offset.left + boundingBox.width;
            }
            return {
                top: top,
                left: left
            };
        } catch (e) {
            return $$.mouseFixedPositionFromRange(event);
        }
    }

    $$.mouseFixedPositionFromRange = function(boundingBox) {
        return {
            top: boundingBox.top,
            left: boundingBox.left
        }
    };

    $$.getQuoteFromHighlights = function(ranges) {
        var text = [];
        var exactText = [];
        for (var i = 0, len = ranges.length; i < len; i++) {
            text = [];
            var r = ranges[i];
            try{
                text.push(Hxighlighter.trim(r.text()));
            } catch(e) {
                text.push(Hxighlighter.trim(r.toString()))
                if (r.toString === "[object Object]") {
                    text.pop();
                    text.push(r.exact);
                }
            }

            var exact = text.join(' / ').replace(/[\n\r]/g, '<br>') ;
            exactText.push(exact);
        }
        return {
            'exact': exactText,
            'exactNoHtml': text
        };
    }

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
     * trims whitespace from strings
     *
     * @param      {string}  s       original string
     * @return     {string}  trimmed string
     */
    $$.trim = function(s) {
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
        // console.log(eventName, list);
        if (!$$.exists(instanceID) || instanceID === "") {
            // WARNING: If events aren't properly sent/received, check pub/sub functions are encoding object id in base64
            jQuery.each($$._instanceIDs, function(_, inst_id) {  
                // some of the events require the core to handle calling the components in a certain order
                if ($$.requiredEvents.indexOf(eventName) >= 0) {
                    $$._instances[inst_id].core[eventName](list);
                }
                // console.log("publish: ", eventName + '.' + inst_id)
                jQuery.publish(eventName + '.' + inst_id, list);
            });
        } else {
            // some of the events require the core to handle calling the components in a certain order
            if ($$.requiredEvents.indexOf(eventName) >= 0) {
                $$._instances[instanceID].core[eventName](list);
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
    $$.subscribeEvent = function(eventName, instanceID, callBack) {
        if (!$$.exists(instanceID) || instanceID === "") {
            jQuery.each($$._instanceIDs, function(_, inst_id) {
                // console.log("subscribe:", eventName + '.' + inst_id)
                jQuery.subscribe(eventName + '.' + inst_id, callBack);
            });
        } else {
            // console.log("subscribe:", eventName + '.' + instanceID)
            jQuery.subscribe(eventName + '.' + instanceID, callBack);
        }
    };

    $$.pauseEvent = function(e){
        if(e.stopPropagation) e.stopPropagation();
        if(e.preventDefault) e.preventDefault();
        e.cancelBubble=true;
        e.returnValue=false;
        return false;
    }

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));