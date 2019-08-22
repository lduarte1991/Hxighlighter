var hrange = require('../h-range.js');
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
            //console.log('Error in delimiter...no suitable delimiter found!');
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
        jQuery(document).on('keydown', function(event){
            if ((event.key == '1' && (event.altKey || event.ctrlKey)) || (event.key == '\'' && (event.altKey || event.ctrlKey))) {
                event.preventDefault();
                //move this to external button
                if(!event.target.isContentEditable && !jQuery(event.target).hasClass('form-control')){
                    self.turnSelectionModeOn();
                }
                return false;
            } else if (event.key == 'Escape') {
                //console.log("hello");
                self.turnSelectionModeOff();
            // } else if (event.key == ' ') {
            //     event.preventDefault();
            //     return false;
            }

            if ((event.key == '2' && (event.altKey || event.ctrlKey))) {
                event.preventDefault();
                var currentInst = jQuery('.sr-alert').html();
                if (currentInst.trim() === "") {
                    currentInst = 'Hit "Ctrl + 1" to beginning annotating the text by marking them with apostrophes.';
                }
                jQuery('.sr-alert').html('');
                setTimeout(function() {
                    jQuery('.sr-alert').html(currentInst);
                }, 250);
            }
            if ((event.key == '3' && (event.altKey || event.ctrlKey))) {
                var currVal = jQuery('#hx-sr-notifications').attr('aria-live');
                var newVal = (currVal == "off") ? 'assertive' : 'off';
                var newAlert = currVal == "off" ? 'Help text is on' : 'Help text is off';
                if (newVal == "off") {
                    jQuery('.sr-real-alert').html(newAlert);
                    setTimeout(function() {
                        jQuery('#hx-sr-notifications').attr('aria-live', newVal);
                        jQuery('.sr-real-alert').html('');
                    }, 500);
                    var currVal = jQuery('.sr-alert').html();
                    jQuery('.sr-alert').html('');
                    jQuery('.sr-alert').data('old', currVal);
                } else {
                    jQuery('.sr-alert').html(jQuery('.sr-alert').data('old'));
                    jQuery('#hx-sr-notifications').attr('aria-live', newVal);
                    jQuery('.sr-real-alert').html(newAlert);

                }
                
                event.preventDefault();
            }
        });
        jQuery(document).on('keyup', '*[role="button"]', function(evt) {
            if (evt.key == 'Enter' || evt.key == ' ') {
                jQuery(evt.currentTarget).click();
                return $.pauseEvent(evt);;
            }
        });
        // var slot = self.element;
        // if (!self.element.hasClass('annotation-slot')) {
        //     slot = self.element.find('.annotation-slot');
        // }
        // if (slot.length === 0) {
        //     slot = self.element.closest('.annotation-slot');
        // }
        // jQuery(slot).prepend('<button class="hx-keyboard-toggle btn btn-default" style="margin-right: 10px;">Toggle Keyboard Input</button>');
        jQuery(document).on('click', 'a[class*="keyboard-toggle"]', function(evt) {
            jQuery('#key-help').toggleClass('sr-only');
            jQuery(this).toggleClass('selected');
            jQuery(self.element).closest('main').animate({
                scrollTop: jQuery(self.element).closest('main').scrollTop() + jQuery('#key-help').offset().top - 50
            })
            // if (jQuery(this).hasClass('selection-mode-on')) {
               // self.turnSelectionModeOff();
                //jQuery(this).removeClass('selection-mode-on');
            // } else {
                // self.turnSelectionModeOn();
                //jQuery(this).addClass('selection-mode-on');
            // }
        });
        jQuery(document).on('click', 'button[class*="make-annotation-button"]', function(evt) {
            if (jQuery(this).hasClass('selection-mode-on')) {
                self.turnSelectionModeOff();
                jQuery(this).removeClass('selection-mode-on');
            } else {
                self.turnSelectionModeOn();
                jQuery(this).addClass('selection-mode-on');
            }
        });
    };

    $.KeyboardSelector.prototype.turnSelectionModeOn = function () {
        this.saveHTML = this.element.innerHTML;
        var toggleButton = jQuery(this.element).parent().find('.hx-toggle-annotations');
        if (!toggleButton.hasClass('should-show')) {
            toggleButton.click();
        }

        if (window.navigator.platform.indexOf('Mac') !== -1) {
            jQuery('.sr-alert').html('Enter the text box until editing text (usually VoiceOver Keys + Down Arrow) then move around using arrow keys without VoiceOver keys held down.');
        }
        jQuery(this.element).attr('contenteditable', 'true');
        jQuery(this.element).attr('role', 'textbox');
        jQuery(this.element).attr('tabindex', "0");
        jQuery(this.element).attr('aria-label', 'You are now in the text to be annotated. Mark selection with asterisks.');
        jQuery(this.element).attr('aria-multiline', 'true');
        jQuery(this.element).attr('accesskey', 't');
        jQuery('.hx-selector-img').remove();
        jQuery(this.element).on('keydown', jQuery.proxy(this.filterKeys, this));
        jQuery(this.element).on('keyup', jQuery.proxy(this.setSelection, this));
        
        this.start = undefined;
        this.currentSelection = undefined;
        this.element.innerHTML = this.saveHTML;
        this.element.focus();
    };

    $.KeyboardSelector.prototype.turnSelectionModeOff = function() {
        var self = this;
        var toggleButton = jQuery(this.element).parent().find('.hx-toggle-annotations');
        if (toggleButton.hasClass('should-show')) {
            toggleButton.click();
        }
        jQuery(this.element).off('keydown');
        jQuery(this.element).off('keyup');
        jQuery(this.element).attr('contenteditable', 'false');
        jQuery(this.element).attr('role', '');
        jQuery(this.element).attr('tabindex', '');
        jQuery(this.element).attr('aria-multiline', 'false');
        jQuery(this.element).attr('outline', '0px');
        jQuery('.hx-selector-img').remove();
        this.start = undefined;
        this.currentSelection = undefined;
        setTimeout(function() {
            self.element.blur();
        }, 250);
    };

    /* Credit to Rich Caloggero
     * https://github.com/RichCaloggero/annotator/blob/master/annotator.html
     */
    $.KeyboardSelector.prototype.filterKeys = function(keyPressed) {
        var self = this;
        const key = keyPressed.key || keypressed.keyCode;
        switch (key) {
            case self.delimiter:
                return false;
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Up":
            case "Down":
            case "Left":
            case "Right":
            case 37:
            case 38:
            case 39:
            case 40:
            case "Home":
            case "End":
            case "Tab":
                return true;
            case "Backspace":
                if (self.verifyBackspace()) {
                    self.start = undefined;
                    return true;
                }
            case "Escape":
                self.turnSelectionModeOff();
                keyPressed.preventDefault();
                jQuery('.sr-real-alert').html("Keyboard Selection Mode is off.");
                return false;
            case "2":
                if (keyPressed.altKey || keyPressed.ctrlKey) {
                    jQuery('.sr-alert').html(jQuery('.sr-alert').html());
                }
                keyPressed.preventDefault();
                return false;
            case "3":
                if (keyPressed.altKey || keyPressed.ctrlKey) {
                    var currVal = jQuery('.sr-alert').attr('aria-live');
                    var newVal = currVal == "off" ? 'polite' : 'off';
                    jQuery('.sr-alert').attr('aria-live', newVal);
                    var newAlert = currVal == "off" ? 'Help text is on' : 'Help text is off';
                    jQuery('.sr-real-alert').html(newAlert);
                }
                keyPressed.preventDefault();
                return false;
            default: keyPressed.preventDefault();
                return false;
            } // switch
    };

    $.KeyboardSelector.prototype.getBoundingClientRect = function(range) {
        var newRange = range.cloneRange();
        try {
            newRange.setStart(range.startContainer, range.startOffset);
            newRange.setEnd(range.startContainer, range.startOffset+1);
            return {
                top: newRange.getBoundingClientRect().top,
                left: newRange.getBoundingClientRect().left,
            }
        } catch(e) {
            newRange.setStart(range.startContainer, range.startOffset-1);
            newRange.setEnd(range.startContainer, range.startOffset);
            return {
                top: newRange.getBoundingClientRect().top,
                left: newRange.getBoundingClientRect().right,
            }
        }
    };

    $.KeyboardSelector.prototype.setSelection = function(keyPressed) {
        var self = this;
        const key = keyPressed.key || keyPressed.keyCode;
        switch (key) {
            case self.delimiter:
                if (!(self.start) || typeof(self.start) == "undefined") {
                    self.start = self.copySelection(getSelection());
                    var bcr = self.getBoundingClientRect(self.start);
                    //console.log($.mouseFixedPositionFromRange(self.start), bcr, jQuery(window).scrollTop());
                    jQuery('body').append('<div class="hx-selector-img"></div>');
                    jQuery('.hx-selector-img').css({
                        top: bcr.top + jQuery(window).scrollTop() - 5,
                        left: bcr.left - 5
                    });
                    jQuery('.sr-alert').html();
                    jQuery('.sr-alert').html('Move to end of text to be annotated and press "*" again.')
                } else {
                    var end = self.copySelection(getSelection());
                    jQuery('.hx-selector-img').remove();
                    //console.log("Found end", end);
                    if (self.currentSelection) {
                        //console.log(hrange.serializeRange(self.currentSelection, self.element, 'annotator-hl'), self.currentSelection.toString());
                        
                    } else {
                        var end = self.copySelection(getSelection())
                        var posStart = hrange.getGlobalOffset(self.start, self.element, 'annotator-hl');
                        var posEnd = hrange.getGlobalOffset(end, self.element, 'annotator-hl');
                        var boundingBox = undefined;
                        self.currentSelection = document.createRange();
                        if(posStart.startOffset < posEnd.startOffset) {
                            self.currentSelection.setStart(self.start.startContainer, self.start.startOffset);
                            self.currentSelection.setEnd(end.startContainer, end.startOffset);
                        } else {
                            self.currentSelection.setStart(end.startContainer, end.startOffset);
                            self.currentSelection.setEnd(self.start.startContainer, self.start.startOffset);
                        }
                    }
                    boundingBox = {
                        top: self.currentSelection.getBoundingClientRect().top + jQuery(window).scrollTop() - 5,
                        left: self.currentSelection.getBoundingClientRect().left - 5
                    }
                    var ser = hrange.serializeRange(self.currentSelection, self.element, 'annotator-hl');
                    jQuery('.sr-alert').html('');
                    jQuery('.sr-alert').html('You are now in a text box. Add your annotation. The quote you have selected is: <em>' + ser.text.exact + "</em>");
                    Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [ser], boundingBox]);
                    //console.log("Active Element", document.activeElement.className);
                    if (document.activeElement.className.indexOf('note-editable') == -1) {
                        //console.log("BLURRING");
                        self.element.blur();
                    } else {
                        setTimeout(function() {
                            jQuery('.note-editable.card-block')[0].focus();
                            //console.log("should be focusing on", document.activeElement);
                        }, 250);
                    }
                    self.turnSelectionModeOff();
                    // var startComesAfter = self.startComesAfter(self.start, end);
                    // console.log("Found other", startComesAfter);
                    // self.start = startComesAfter[0];
                    // self.processSelection(startComesAfter[0], startComesAfter[1]);
                }
                break;
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Up":
            case "Down":
            case "Left":
            case "Right":
            case 37:
            case 38:
            case 39:
            case 40:
                if (self.start) {
                    var end = self.copySelection(getSelection())
                    var posStart = hrange.getGlobalOffset(self.start, self.element, 'annotator-hl');
                    var posEnd = hrange.getGlobalOffset(end, self.element, 'annotator-hl')
                    self.currentSelection = document.createRange();
                    if(posStart.startOffset < posEnd.startOffset) {
                        self.currentSelection.setStart(self.start.startContainer, self.start.startOffset);
                        self.currentSelection.setEnd(end.startContainer, end.startOffset);
                    } else {
                        self.currentSelection.setStart(end.startContainer, end.startOffset);
                        self.currentSelection.setEnd(self.start.startContainer, self.start.startOffset);
                    }
                    // console.log(self.start, end);
                    // console.log(self.currentSelection, self.currentSelection.toString());
                    // var sel = window.getSelection();
                    // sel.removeAllRanges();
                    // sel.addRange(self.currentSelection);
                }
        }
    };

    $.KeyboardSelector.prototype.copySelection = function(selection) {
        // const sel = {
        //     anchorNode: selection.anchorNode,
        //     anchorOffset: selection.anchorOffset,
        //     focusNode: selection.focusNode,
        //     focusOffset: selection.focusOffset,
        //     parentElement: selection.anchorNode.parentElement
        // };
        return selection.getRangeAt(0);
    };

    $.KeyboardSelector.prototype.processSelection = function(start, end) {
        var self = this;
        const s = getSelection();
        //console.log("LOOK HERE", start, end);
        const r = this.removeMarkers(start, end);
        self.start = undefined;
        //console.log("R!", r);

        try {
            var boundingBox = r.end.parentElement.getBoundingClientRect();
        } catch(e) {
            var boundingBox = r.endContainer.parentElement.getBoundingClientRect();
        }
        //console.log(boundingBox);

        // publish selection made
        Hxighlighter.publishEvent('TargetSelectionMade', this.instance_id, [this.element, [hrange.serializeRange(r, self.element, 'annotator-hl')], boundingBox]);
        //console.log("Element Focused", document.activeElement);
        if (document.activeElement.className.indexOf('note-editable') == -1) {
            self.element.blur();
        }
        self.turnSelectionModeOff();
        // this.element.focus();
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
        var self = this;
        const _start = start.anchorNode;
        const _startOffset = start.anchorOffset - 1;
        const _end = end.anchorNode;
        const _endOffset = end.anchorOffset - 1;
        //console.log(_start, _startOffset, _end, _endOffset);

        const t2 = this.removeCharacter(_end.textContent, _endOffset);
        _end.textContent = t2;

        const t1 = this.removeCharacter(_start.textContent, _startOffset);
        _start.textContent = t1;

        const r = document.createRange();
        r.setStart(_start, _startOffset);

        var realRange = {
            startContainer: _start,
            startOffset: _startOffset,
            endContainer: _end,
        }
        
        if (start.anchorNode === end.anchorNode) {
            realRange['endOffset'] = _endOffset - 1;
            r.setEnd(_start, _endOffset - 1);
        } else {
            realRange['endOffset'] = _endOffset;
            r.setEnd(_start, _endOffset);
        }
        // getting common ancestors
        // lonesomeday @ https://stackoverflow.com/questions/3960843/how-to-find-the-nearest-common-ancestors-of-two-or-more-nodes
        realRange['commonAncestorContainer'] = jQuery(_start).parents().has(_end).first()[0];
        realRange['exact'] = [r.toString()];
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(r);
        // convert to xpath and then back to a range
        // var sR = hrange.serializeRange(r, self.element, 'annotator-hl');
        //var nR = hrange.normalizeRange(sR, self.element, 'annotator-hl');
        // console.log(sR, nR);
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
        const r = document.createRange();
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
