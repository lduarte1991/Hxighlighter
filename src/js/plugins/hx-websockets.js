/**
 *  Websockets Annotations Plugin
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
    $.Websockets = function(options, instanceID) {
        this.options = jQuery.extend({}, options);
        this.instanceID = instanceID;
        this.init();
        this.timerRetryInterval;
        this.socket = null;
        return this;
    };

    /**
     * Initializes instance
     */
    $.Websockets.prototype.init = function() {
        var self = this;
        self.slot_id = self.options.context_id.replace(/[^a-zA-Z0-9-.]/g, '-') + '--' + self.options.collection_id + '--' + self.options.object_id;
        self.setUpConnection();
    };

    $.Websockets.prototype.saving = function(annotation) {
        return annotation;
    };

    $.Websockets.prototype.setUpConnection = function() {
        var self = this;
        console.log("WS Options: ", self.slot_id, self.options, self.options.Websockets);
        self.socket = self.openWs(self.slot_id, self.options.Websockets.wsUrl);
        self.socket.onopen = function(e) {
            self.onWsOpen(e);
        };
        self.socket.onmessage = function(e) {
            var data = JSON.parse(e.data);
            self.receiveWsMessage(data);
        };
        self.socket.onclose = function(e) {
            self.onWsClose(e);
        };
    };

    $.Websockets.prototype.receiveWsMessage = function(response) {
        var self = this;
        var message = response['message'];
        var annotation = eval( "(" + message + ")");
        console.log("WS:" + message)
        self.convertAnnotation(annotation, function(wa) {
            console.log("YEH", response)
            if (response['type'] === 'annotation_deleted') {
                $.publishEvent('GetSpecificAnnotationData', self.instanceID, [wa.id, function(annotationFound) {
                    if (wa.media !== "Annotation") {
                        $.publishEvent('TargetAnnotationUndraw', self.instanceID, [annotationFound]);
                        jQuery('.item-' + wa.id).remove();
                    } else {
                        $.publishEvent('removeReply', self.instanceID, [wa]);
                        jQuery('.reply-item-' + wa.id).remove();
                    }
                }]);
            } else {
                $.publishEvent('wsAnnotationLoaded', self.instanceID, [wa]);
                console.log("HERE:", wa)
                if (wa.media !== 'comment') {
                    if (response['type'] === 'annotation_updated') {
                        $.publishEvent('GetSpecificAnnotationData', self.instanceID, [wa.id, function(annotationFound) {
                            $.publishEvent('TargetAnnotationUndraw', self.instanceID, [annotationFound]);
                            $.publishEvent('TargetAnnotationDraw', self.instanceID, [wa]);
                        }]);
                    } else {
                        $.publishEvent('TargetAnnotationDraw', self.instanceID, [wa]);
                    }
                }
            }
        });
    };

    $.Websockets.prototype.openWs = function(slot_id, wsUrl) {
        var self = this;
        var notificationSocket = new WebSocket(
            'wss://' + wsUrl +
            '/ws/notification/' + slot_id + '/?utm_source=' + self.options.Websockets.utm +
            '&resource_link_id=' + self.options.Websockets.resource);

        return notificationSocket;
    };

    $.Websockets.prototype.onWsOpen = function() {
        var self = this;
        if (self.timerRetryInterval) {
            clearInterval(self.timerRetryInterval);
            self.timerRetryInterval = undefined;
        }
    };

    $.Websockets.prototype.onWsClose = function() {
        var self = this;
        if (!self.timerRetryInterval) {
            self.timerRetryInterval = setInterval(function() {
                console.log('intervalrunning');
                self.setUpConnection();
            }, 5000)
        }
    };

    Object.defineProperty($.Websockets, 'name', {
        value: "Websockets"
    });

    $.Websockets.prototype.convertAnnotation = function(annotation, callBack) {
        var self = this;
        if (annotation && annotation.schema_version) {
            console.log("option 1");
            return self.convertingFromWebAnnotations(annotation, callBack);
        } else {
            console.log("option 2");
            return self.convertingFromAnnotatorJS(annotation, callBack);
        }
    };

    $.Websockets.prototype.convertingFromWebAnnotations = function(annotation, callBack) {
        var self = this;
        $.publishEvent('convertFromWebAnnotation', self.instanceID, [self.options.slot, annotation, callBack]);
    };

    $.Websockets.prototype.convertingFromAnnotatorJS = function(annotation, callBack) {
        var self = this;
        var ranges = annotation.ranges;
        var rangeList = [];
        ranges.forEach(function(range) {
            rangeList.push({
                'xpath': range,
                'text': {
                    prefix: '',
                    exact: annotation.quote,
                    suffix: ''
                }
            })
        });
        var annotation = {
            annotationText: [annotation.text],
            created: annotation.created,
            creator: annotation.user,
            exact: annotation.quote,
            id: annotation.id,
            media: annotation.media,
            tags: annotation.tags,
            ranges: rangeList,
            totalReplies: annotation.totalComments,
            permissions: annotation.permissions

        }
        callBack(annotation)
    };

    $.plugins.push($.Websockets);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));