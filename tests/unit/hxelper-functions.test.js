import {expect} from "chai";

import Hxighlighter from '../../src/js/core/hxighlighter.js';
import '../../src/js/vendors/jquery-tiny-pubsub.js';
import '../../src/js/core/hxelper-functions.js';

describe('Hxighlighter Helper Functions', function() {

  describe('getUniqueId()', function() {
    it('should return a valid uuid', function() {
      expect(Hxighlighter.getUniqueId()).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i);
    });

    it('should return unique values on successive calls', function() {
      var id1 = Hxighlighter.getUniqueId();
      var id2 = Hxighlighter.getUniqueId();
      expect(id1).to.not.equal(id2);
    });
  });

  describe('exists()', function() {
    it('should return false for undefined', function() {
      expect(Hxighlighter.exists(undefined)).to.be.false;
    });

    it('should return false when called with no argument', function() {
      expect(Hxighlighter.exists()).to.be.false;
    });

    it('should return true for an object', function() {
      expect(Hxighlighter.exists({})).to.be.true;
    });

    it('should return true for null (null is not undefined)', function() {
      expect(Hxighlighter.exists(null)).to.be.true;
    });

    it('should return true for 0', function() {
      expect(Hxighlighter.exists(0)).to.be.true;
    });

    it('should return true for false', function() {
      expect(Hxighlighter.exists(false)).to.be.true;
    });

    it('should return true for empty string', function() {
      expect(Hxighlighter.exists("")).to.be.true;
    });

    it('should return true for NaN', function() {
      expect(Hxighlighter.exists(NaN)).to.be.true;
    });
  });

  describe('trim()', function() {
    it('should trim leading and trailing spaces', function() {
      expect(Hxighlighter.trim('   abcd    ')).to.equal('abcd');
    });

    it('should trim tabs', function() {
      expect(Hxighlighter.trim('\tabcd\t')).to.equal('abcd');
    });

    it('should trim newlines', function() {
      expect(Hxighlighter.trim('\nabcd\n')).to.equal('abcd');
    });

    it('should trim non-breaking spaces (\\xA0)', function() {
      expect(Hxighlighter.trim('\xA0abcd\xA0')).to.equal('abcd');
    });

    it('should return empty string when given only whitespace', function() {
      expect(Hxighlighter.trim('   ')).to.equal('');
    });

    it('should return the same string if already trimmed', function() {
      expect(Hxighlighter.trim('abcd')).to.equal('abcd');
    });

    it('should handle empty string', function() {
      expect(Hxighlighter.trim('')).to.equal('');
    });
  });

  describe('pauseEvent()', function() {
    it('should call stopPropagation and preventDefault', function() {
      var called = {stop: false, prevent: false};
      var mockEvent = {
        stopPropagation: function() { called.stop = true; },
        preventDefault: function() { called.prevent = true; },
        cancelBubble: false,
        returnValue: true
      };
      Hxighlighter.pauseEvent(mockEvent);
      expect(called.stop).to.be.true;
      expect(called.prevent).to.be.true;
    });

    it('should set cancelBubble to true and returnValue to false', function() {
      var mockEvent = {
        stopPropagation: function() {},
        preventDefault: function() {},
        cancelBubble: false,
        returnValue: true
      };
      Hxighlighter.pauseEvent(mockEvent);
      expect(mockEvent.cancelBubble).to.be.true;
      expect(mockEvent.returnValue).to.be.false;
    });

    it('should return false', function() {
      var mockEvent = {
        stopPropagation: function() {},
        preventDefault: function() {}
      };
      var result = Hxighlighter.pauseEvent(mockEvent);
      expect(result).to.be.false;
    });

    it('should not throw if stopPropagation/preventDefault are missing', function() {
      var mockEvent = {};
      expect(function() {
        Hxighlighter.pauseEvent(mockEvent);
      }).to.not.throw();
    });
  });

  describe('publishEvent() and subscribeEvent()', function() {
    var inst1 = 'test-instance-1';
    var inst2 = 'test-instance-2';

    beforeEach(function() {
      Hxighlighter._instances = {};
      Hxighlighter._instances[inst1] = { id: inst1, core: {} };
      Hxighlighter._instances[inst2] = { id: inst2, core: {} };
      Hxighlighter._instanceIDs = [inst1, inst2];
    });

    afterEach(function() {
      // unsubscribe all events to avoid leaking between tests
      jQuery.unsubscribe('TestEvent.' + inst1);
      jQuery.unsubscribe('TestEvent.' + inst2);
      jQuery.unsubscribe('ComponentEnable.' + inst1);
      jQuery.unsubscribe('ComponentEnable.' + inst2);
      Hxighlighter._instances = undefined;
      Hxighlighter._instanceIDs = undefined;
    });

    it('should deliver event to a specific instance subscriber', function() {
      var received = false;
      Hxighlighter.subscribeEvent('TestEvent', inst1, function() {
        received = true;
      });
      Hxighlighter.publishEvent('TestEvent', inst1, []);
      expect(received).to.be.true;
    });

    it('should not deliver event to a different instance subscriber', function() {
      var received = false;
      Hxighlighter.subscribeEvent('TestEvent', inst2, function() {
        received = true;
      });
      Hxighlighter.publishEvent('TestEvent', inst1, []);
      expect(received).to.be.false;
    });

    it('should deliver to all instances when instanceID is empty string', function() {
      var count = 0;
      Hxighlighter.subscribeEvent('TestEvent', inst1, function() { count++; });
      Hxighlighter.subscribeEvent('TestEvent', inst2, function() { count++; });
      Hxighlighter.publishEvent('TestEvent', '', []);
      expect(count).to.equal(2);
    });

    it('should deliver to all instances when instanceID is undefined', function() {
      var count = 0;
      Hxighlighter.subscribeEvent('TestEvent', inst1, function() { count++; });
      Hxighlighter.subscribeEvent('TestEvent', inst2, function() { count++; });
      Hxighlighter.publishEvent('TestEvent', undefined, []);
      expect(count).to.equal(2);
    });

    it('should subscribe all instances when instanceID is empty string', function() {
      var count = 0;
      Hxighlighter.subscribeEvent('TestEvent', '', function() { count++; });
      Hxighlighter.publishEvent('TestEvent', inst1, []);
      Hxighlighter.publishEvent('TestEvent', inst2, []);
      expect(count).to.equal(2);
    });

    it('should call core method for required events when publishing to specific instance', function() {
      var coreCalled = false;
      Hxighlighter._instances[inst1].core.ComponentEnable = function() {
        coreCalled = true;
      };
      Hxighlighter.publishEvent('ComponentEnable', inst1, []);
      expect(coreCalled).to.be.true;
    });

    it('should call core method for required events when publishing to all instances', function() {
      var callCount = 0;
      Hxighlighter._instances[inst1].core.ComponentEnable = function() { callCount++; };
      Hxighlighter._instances[inst2].core.ComponentEnable = function() { callCount++; };
      Hxighlighter.publishEvent('ComponentEnable', '', []);
      expect(callCount).to.equal(2);
    });
  });

  describe('getQuoteFromHighlights()', function() {
    it('should return empty arrays for empty input', function() {
      var result = Hxighlighter.getQuoteFromHighlights([]);
      expect(result.exact).to.deep.equal([]);
      expect(result.exactNoHtml).to.deep.equal([]);
    });

    it('should extract text from a single range with .text()', function() {
      var mockRange = { text: function() { return 'hello world'; } };
      var result = Hxighlighter.getQuoteFromHighlights([mockRange]);
      expect(result.exact).to.deep.equal(['hello world']);
      expect(result.exactNoHtml).to.deep.equal(['hello world']);
    });

    it('should replace newlines with <br> in exact output', function() {
      var mockRange = { text: function() { return 'line1\nline2'; } };
      var result = Hxighlighter.getQuoteFromHighlights([mockRange]);
      expect(result.exact).to.deep.equal(['line1<br>line2']);
    });

    it('should collect text from ALL ranges in exactNoHtml (not just the last)', function() {
      var range1 = { text: function() { return 'first'; } };
      var range2 = { text: function() { return 'second'; } };
      var result = Hxighlighter.getQuoteFromHighlights([range1, range2]);
      // exactNoHtml should contain text from both ranges
      expect(result.exactNoHtml).to.include('first');
      expect(result.exactNoHtml).to.include('second');
    });

    it('should fall back to .exact when .toString() returns "[object Object]"', function() {
      var mockRange = {
        exact: 'expected text',
        toString: function() { return '[object Object]'; }
      };
      var result = Hxighlighter.getQuoteFromHighlights([mockRange]);
      expect(result.exact).to.deep.equal(['expected text']);
    });
  });

  describe('mouseFixedPosition()', function() {
    it('should return {top, left} for a mouse event with container', function() {
      // Create a mock container element
      var mockContainer = {
        getBoundingClientRect: function() {
          return { top: 100, left: 50, width: 500, height: 400 };
        },
        scrollTop: 0,
        scrollLeft: 0
      };

      // Mock getContainer to return our mock
      var originalGetContainer = Hxighlighter.getContainer;
      Hxighlighter.getContainer = function() { return mockContainer; };

      try {
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
      } catch (e) { /* some environments don't allow this */ }

      var mockEvent = {
        target: document.body,
        type: 'mouseup',
        pageX: 200,
        pageY: 300
      };

      var result = Hxighlighter.mouseFixedPosition(mockEvent);
      expect(result).to.have.property('top').that.is.a('number');
      expect(result).to.have.property('left').that.is.a('number');
      // pageY(300) - (containerRect.top(100) + scrollY(0) - scrollTop(0)) = 200
      expect(result.top).to.equal(200);
      // pageX(200) - (containerRect.left(50) + scrollX(0) - scrollLeft(0)) = 150
      expect(result.left).to.equal(150);

      Hxighlighter.getContainer = originalGetContainer;
    });

    it('should return {top, left} for a mouse event without container (static body)', function() {
      var originalGetContainer = Hxighlighter.getContainer;
      Hxighlighter.getContainer = function() { return null; };

      // Ensure body is static (default in jsdom)
      var mockEvent = {
        target: document.body,
        type: 'mouseup',
        pageX: 150,
        pageY: 250
      };

      var result = Hxighlighter.mouseFixedPosition(mockEvent);
      expect(result).to.have.property('top').that.is.a('number');
      expect(result).to.have.property('left').that.is.a('number');
      // With static body and no container, offset is {top:0, left:0}
      expect(result.top).to.equal(250);
      expect(result.left).to.equal(150);

      Hxighlighter.getContainer = originalGetContainer;
    });

    it('should return numeric coordinates from the fallback path (not undefined)', function() {
      var originalGetContainer = Hxighlighter.getContainer;
      Hxighlighter.getContainer = function() { return null; };

      // Create an event that will cause the try block to throw:
      // - type contains 'key' (not 'mouse'), triggering the keyboard branch
      // - but no selection exists, so getRangeAt(0) throws
      var mockEvent = {
        target: document.body,
        type: 'keyup',
        pageX: 100,
        pageY: 200
      };

      // Clear any selection to force the catch path
      window.getSelection().removeAllRanges();

      var result = Hxighlighter.mouseFixedPosition(mockEvent);
      expect(result).to.have.property('top').that.is.a('number');
      expect(result).to.have.property('left').that.is.a('number');

      Hxighlighter.getContainer = originalGetContainer;
    });
  });

  describe('mouseFixedPositionFromRange()', function() {
    it('should return top and left from a bounding box object', function() {
      var result = Hxighlighter.mouseFixedPositionFromRange({top: 10, left: 20});
      expect(result.top).to.equal(10);
      expect(result.left).to.equal(20);
    });
  });

  describe('trim() robustness', function() {
    it('should return empty string when given null', function() {
      expect(Hxighlighter.trim(null)).to.equal('');
    });

    it('should return empty string when given undefined', function() {
      expect(Hxighlighter.trim(undefined)).to.equal('');
    });

    it('should coerce numbers to string and trim', function() {
      expect(Hxighlighter.trim(123)).to.equal('123');
    });
  });
});