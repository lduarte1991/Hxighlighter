/**
 * Gets the current top/left position for an event (in particular your mouse pointer)
 *
 * @param      {Object}  event   The event
 * @return     {Object}  { description_of_the_return_value }
 */
function mouseFixedPosition(event) {
    var body = window.document.body;
    var offset = {top: 0, left: 0};

    if ($(body).css('position') !== "static") {
        offset = $(body).offset();
    }

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
}

function getQuoteFromHighlights(ranges) {
    var text = [];
    var exactText = [];
    for (var i = 0, len = ranges.length; i < len; i++) {
        text = [];
        var r = ranges[i];
        text.push(trim(r.text()));

        var exact = text.join(' / ').replace(/[\n\r]/g, '<br>') ;
        exactText.push(exact);
    }
    return {
        'exact': exactText,
        'exactNoHtml': text
    };
}

