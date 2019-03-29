(function($) {
    $.KeyboardSelector = function(element, inst_id) {
        this.element = element;
        if (!jQuery(element).hasClass('annotator-wrapper')) {
            this.element = jQuery(element).find('.annotator-wrapper');
        }
        this.instance_id = inst_id;
        this.delimiter_list = ['*', '+', '#', '^'];
        this.keyMaps = {
            'BACKSPACE': 8,
            'TAB': 9,
            'ENTER': 13,
            'SHIFT': 16,
            'CTRL': 17,
            'ALT': 18,
            'ESC': 27,
            'SPACE': 32,
            'LEFT': 37,
            'UP': 38,
            'RIGHT': 39,
            'DOWN': 40,
            'DELETE': 46,
            'MULTIPLY': 106,
            'ADD': 107,
            'PIPE': 220,
            '*': 56,
            '+': 187,
            'HOME': 36,
            'END': 35
        };
        this.init();
    };

    $.KeyboardSelector.prototype.init = function() {
        var self = this;
        this.delimiter = this.checkDelimiter(self.element);
        if (!this.delimiter) {
            console.log('Error in delimiter...no suitable delimiter found!');
        }
        this.start = undefined;

        this.setUpButton();
    };

    $.KeyboardSelector.prototype.checkDelimiter = function(element) {
        var textSearch = jQuery(element).text();
        for (var i = 0; i < this.delimiter_list.length; i++) {
            var testDelimiter = this.delimiter_list[i];
            if (textSearch.indexOf(testDelimiter) == -1) {
                return testDelimiter;
            }
        }
        return undefined;
    };

    $.KeyboardSelector.prototype.setUpButton = function() {
        var self = this;
        jQuery(document).on('keyup', function(event){
            if (event.key == 'a') {
                //move this to external button
                self.turnSelectionModeOn();
            } else if (event.key == 'Escape') {
                self.turnSelectionModeOff();
            }
        });
    };

    $.KeyboardSelector.prototype.turnSelectionModeOn = function () {
        jQuery(this.element).attr('contenteditable', 'true');
        jQuery(this.element).attr('role', 'textbox');
        jQuery(this.element).attr('tabindex', "0");
        jQuery(this.element).attr('aria-multiline', 'true');
        jQuery(this.element).attr('accesskey', 't');
        jQuery(this.element).on('keydown', jQuery.proxy(this.filterKeys, this));
        jQuery(this.element).on('keyup', jQuery.proxy(this.setSelection, this));
        this.element.focus();
    };

    $.KeyboardSelector.prototype.turnSelectionModeOff = function() {
        jQuery(this.element).off('keydown');
        jQuery(this.element).off('keyup');
        jQuery(this.element).attr('contenteditable', 'false');
        jQuery(this.element).attr('role', '');
        jQuery(this.element).attr('tabindex', '');
        jQuery(this.element).attr('aria-multiline', 'false');
        jQuery(this.element).attr('outline', '0px');
        this.element.focus();
    };

    /* Credit to Rich Caloggero
     * https://github.com/RichCaloggero/annotator/blob/master/annotator.html
     */
    $.KeyboardSelector.prototype.filterKeys = function(keyPressed) {
        var self = this;
        const key = keyPressed.key;
        switch (key) {
            case self.delimiter:
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Home":
            case "End":
            case "Tab":
                return true;
            case "Backspace":
                if (self.verifyBackspace()) {
                    self.start = undefined;
                    return true;
                }
            default: keyPressed.preventDefault();
                return false;
            } // switch
    };

    $.KeyboardSelector.prototype.setSelection = function(keyPressed) {
        var self = this;
        const key = keyPressed.key;
        switch (key) {
            case self.delimiter:
                if (!(self.start)) {
                    self.start = self.copySelection(getSelection());
                    console.log("Found start", self.start);
                } else {
                    var end = self.copySelection(getSelection());
                    var startComesAfter = self.startComesAfter(self.start, end);
                    console.log("Found other", startComesAfter);
                    self.start = startComesAfter[0];
                    self.processSelection(startComesAfter[0], startComesAfter[1]);
                }
        }
    };

    $.KeyboardSelector.prototype.copySelection = function(selection) {
        const sel = {
            anchorNode: selection.anchorNode,
            anchorOffset: selection.anchorOffset,
            focusNode: selection.focusNode,
            focusOffset: selection.focusOffset,
            parentElement: selection.anchorNode.parentElement
        };
        return sel;
    };

    $.KeyboardSelector.prototype.processSelection = function(start, end) {
        const s = getSelection();
        const r = this.removeMarkers(start, end);
        this.start = undefined;

        // publish selection made
        Hxighlighter.publishEvent('TargetSelectionMade', this.instance_id, [this.element, [r]]);
        this.element.blur();
        this.element.focus();
    };

    $.KeyboardSelector.prototype.startComesAfter = function(start, end) {
        if (start.anchorNode == end.anchorNode) {
            if (start.anchorOffset > end.anchorOffset) {
                start.anchorOffset += 1;
                return [end, start];
            } else {
                return [start, end];
            }
        }
        // TODO: Handle other use cases (i.e. starting several nodes instead of within the same one)
        var commonAncestor = this.getCommonAncestor(start.anchorNode, end.anchorNode);
        var children = jQuery(commonAncestor).children();
        console.log('Common Ancestor', commonAncestor);
        console.log('Children', children);
        var startCounter = 0;
        jQuery.each(children, function(_, el) {
            if (el == start.parentElement) {  
                startCounter += start.anchorOffset;
                return false;
            } else {
                startCounter += jQuery(el).text().length;
            }
        });
        var endCounter = 0;
        jQuery.each(children, function(_, el) {
            if (el == end.parentElement) {  
                endCounter += end.anchorOffset;
                return false;
            } else {
                endCounter += jQuery(el).text().length;
            }
        });
        if (startCounter > endCounter) {
            return [end, start];
        } else {
            return [start, end];
        }
    };

    /**
     * Gets the common ancestor.
     * Credit: https://stackoverflow.com/questions/3960843/how-to-find-the-nearest-common-ancestors-of-two-or-more-nodes
     *
     * @param      {<type>}  a       { parameter_description }
     * @param      {<type>}  b       { parameter_description }
     * @return     {Object}  The common ancestor.
     */
    $.KeyboardSelector.prototype.getCommonAncestor = function(a, b)
    {
        $parentsa = jQuery(a).parents();
        $parentsb = jQuery(b).parents();

        var found = null;

        $parentsa.each(function() {
            var thisa = this;

            $parentsb.each(function() {
                if (thisa == this)
                {
                    found = this;
                    return false;
                }
            });

            if (found) return false;
        });

        return found;
    };

    $.KeyboardSelector.prototype.removeMarkers = function(start, end) {
        const _start = start.anchorNode;
        const _startOffset = start.anchorOffset - 1;
        const _end = end.anchorNode;
        const _endOffset = end.anchorOffset - 1;

        const t2 = this.removeCharacter(_end.textContent, _endOffset);
        _end.textContent = t2;

        const t1 = this.removeCharacter(_start.textContent, _startOffset);
        _start.textContent = t1;

        const r = new Range();
        r.setStart(_start, _startOffset);
        if (start.parentElement === end.parentElement) {
            r.setEnd(_end, _endOffset - 1);
        } else {
            r.setEnd(_end, _endOffset);
        }
        return r;
    };

    $.KeyboardSelector.prototype.removeCharacter = function(s, offset) {
        if (offset === 0) {
            s = s.slice(1);
        } else if (offset === s.length-1) {
            s = s.slice(0, -1);
        } else {
            s = s.slice(0, offset) + s.slice(offset+1);
        }
        return s;
    };

    $.KeyboardSelector.prototype.verifyBackspace = function() {
        const s = getSelection();
        const r = new Range();
        var startOffset = s.anchorOffset;
        if (startOffset > 0) {
            startOffset -= 1;
        }
        r.setStart(s.anchorNode, startOffset);
        r.setEnd(s.anchorNode, startOffset + 1);

        return r.toString() == this.delimiter;
    };
    
    $.selectors.push($.KeyboardSelector);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
