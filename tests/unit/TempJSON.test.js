import { expect } from 'chai';
import sinon from 'sinon';

import '../../src/js/core/hxighlighter.js';
import '../../src/js/vendors/jquery-tiny-pubsub.js';
import '../../src/js/core/hxelper-functions.js';
import '../../src/js/storage/TempJSON.js';

// Minimal options object shared across tests.
const BASE_OPTIONS = {
  object_id: 'test-object-id',
  mediaType: 'text',
  context_id: 'test-context',
  collection_id: 'test-collection',
  user_id: 'user-123',
  username: 'testuser',
  target_selector: '.hxighlighter-container',
  storageOptions: {
    external_url: {
      inline_mode: false,
      json_url: '',
    }
  }
};

// A minimal internal annotation fixture (the shape StorageAnnotationSave receives).
const INTERNAL_ANN = {
  id: 'ann-001',
  created: new Date('2024-01-01T00:00:00Z'),
  annotationText: ['Hello world'],
  tags: ['tag1', 'tag2'],
  media: 'text',
  ranges: [{
    xpath: {
      start: '/p[1]',
      startOffset: 0,
      end: '/p[1]',
      endOffset: 11,
    },
    position: {
      globalStartOffset: 0,
      globalEndOffset: 11,
    },
    text: {
      prefix: '',
      exact: 'Hello world',
      suffix: '',
    }
  }]
};

function makeTempJSON(optOverrides) {
  const opts = Object.assign({}, BASE_OPTIONS, optOverrides);
  return new Hxighlighter.TempJSON(opts, 'test-inst');
}

// ---------------------------------------------------------------------------
// convertToWebAnnotation
// ---------------------------------------------------------------------------
describe('TempJSON#convertToWebAnnotation', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns an object with W3C Annotation type', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    expect(wa.type).to.equal('Annotation');
  });

  it('preserves the annotation id', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    expect(wa.id).to.equal('ann-001');
  });

  it('sets creator from options', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    expect(wa.creator.id).to.equal('user-123');
    expect(wa.creator.name).to.equal('testuser');
  });

  it('includes a commenting body item for annotationText', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    const commentItem = wa.body.items.find(item => item.purpose === 'commenting');
    expect(commentItem).to.exist;
    expect(commentItem.value).to.equal('Hello world');
  });

  it('converts tags to TextualBody tagging items', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    const tagItems = wa.body.items.filter(item => item.purpose === 'tagging');
    expect(tagItems).to.have.lengthOf(2);
    expect(tagItems.map(t => t.value)).to.include.members(['tag1', 'tag2']);
  });

  it('includes RangeSelector, TextPositionSelector, and TextQuoteSelector in target', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    const selectorItems = wa.target.items[0].selector.items;
    const types = selectorItems.map(s => s.type);
    expect(types).to.include('RangeSelector');
    expect(types).to.include('TextPositionSelector');
    expect(types).to.include('TextQuoteSelector');
  });

  it('stores the exact quote in the TextQuoteSelector', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    const quoteSelector = wa.target.items[0].selector.items.find(s => s.type === 'TextQuoteSelector');
    expect(quoteSelector.exact).to.equal('Hello world');
  });

  it('sets platform fields from options', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    expect(wa.platform.context_id).to.equal('test-context');
    expect(wa.platform.collection_id).to.equal('test-collection');
  });

  it('handles annotationText as a plain string (not array)', function() {
    const ann = Object.assign({}, INTERNAL_ANN, { annotationText: 'plain string' });
    const wa = tj.convertToWebAnnotation(ann, jQuery('<div class="annotator-wrapper"/>'));
    const commentItem = wa.body.items.find(item => item.purpose === 'commenting');
    expect(commentItem.value).to.equal('plain string');
  });
});

// ---------------------------------------------------------------------------
// convertFromWebAnnotation
// ---------------------------------------------------------------------------
describe('TempJSON#convertFromWebAnnotation', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  // Build a minimal W3C annotation to feed back in.
  function makeWebAnn(overrides) {
    return Object.assign({
      id: 'ann-001',
      type: 'Annotation',
      created: '2024-01-01T00:00:00Z',
      creator: { id: 'user-123', name: 'testuser' },
      permissions: { can_read: [], can_update: ['user-123'] },
      totalReplies: 0,
      body: {
        type: 'List',
        items: [
          { type: 'TextualBody', purpose: 'commenting', value: 'Hello world' },
          { type: 'TextualBody', purpose: 'tagging', value: 'tag1' },
        ]
      },
      target: {
        type: 'List',
        items: [{
          type: 'Text',
          selector: {
            type: 'Choice',
            items: [
              {
                type: 'RangeSelector',
                startSelector: { type: 'XPathSelector', value: '/p[1]' },
                endSelector: { type: 'XPathSelector', value: '/p[1]' },
                refinedBy: { type: 'TextPositionSelector', start: 0, end: 11 }
              },
              { type: 'TextPositionSelector', start: 0, end: 11 },
              { type: 'TextQuoteSelector', exact: 'Hello world', prefix: '', suffix: '' }
            ]
          }
        }]
      }
    }, overrides);
  }

  it('returns an object with expected fields', function() {
    const ann = tj.convertFromWebAnnotation(makeWebAnn(), jQuery('<div/>'));
    expect(ann).to.include.keys('id', 'annotationText', 'tags', 'ranges', 'media', 'creator');
  });

  it('preserves the id', function() {
    const ann = tj.convertFromWebAnnotation(makeWebAnn(), jQuery('<div/>'));
    expect(ann.id).to.equal('ann-001');
  });

  it('extracts annotation text', function() {
    const ann = tj.convertFromWebAnnotation(makeWebAnn(), jQuery('<div/>'));
    expect(ann.annotationText).to.include('Hello world');
  });

  it('extracts tags', function() {
    const ann = tj.convertFromWebAnnotation(makeWebAnn(), jQuery('<div/>'));
    expect(ann.tags).to.include('tag1');
  });

  it('extracts the exact quote', function() {
    const ann = tj.convertFromWebAnnotation(makeWebAnn(), jQuery('<div/>'));
    expect(ann.exact).to.equal('Hello world');
  });

  it('round-trips through convertToWebAnnotation and back', function() {
    const wa = tj.convertToWebAnnotation(INTERNAL_ANN, jQuery('<div class="annotator-wrapper"/>'));
    const roundTripped = tj.convertFromWebAnnotation(wa, jQuery('<div/>'));
    expect(roundTripped.id).to.equal(INTERNAL_ANN.id);
    expect(roundTripped.annotationText).to.include('Hello world');
    expect(roundTripped.tags).to.include.members(['tag1', 'tag2']);
  });
});

// ---------------------------------------------------------------------------
// StorageAnnotationSave — new annotation
// ---------------------------------------------------------------------------
describe('TempJSON#StorageAnnotationSave (new)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('adds a new annotation to the store', function() {
    tj.StorageAnnotationSave(Object.assign({}, INTERNAL_ANN), jQuery('<div><div class="annotator-wrapper"/></div>'), false);
    expect(tj.store).to.have.lengthOf(1);
  });

  it('stores the annotation with the correct id', function() {
    tj.StorageAnnotationSave(Object.assign({}, INTERNAL_ANN), jQuery('<div><div class="annotator-wrapper"/></div>'), false);
    expect(tj.store[0].id).to.equal('ann-001');
  });

  it('does not duplicate when called twice with different ids', function() {
    const ann2 = Object.assign({}, INTERNAL_ANN, { id: 'ann-002' });
    tj.StorageAnnotationSave(Object.assign({}, INTERNAL_ANN), jQuery('<div><div class="annotator-wrapper"/></div>'), false);
    tj.StorageAnnotationSave(ann2, jQuery('<div><div class="annotator-wrapper"/></div>'), false);
    expect(tj.store).to.have.lengthOf(2);
  });
});

// ---------------------------------------------------------------------------
// StorageAnnotationSave — updating
// ---------------------------------------------------------------------------
describe('TempJSON#StorageAnnotationSave (update)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('delegates to StorageAnnotationUpdate and does not push a duplicate', function() {
    const spy = sinon.spy(tj, 'StorageAnnotationUpdate');
    tj.StorageAnnotationSave(Object.assign({}, INTERNAL_ANN), jQuery('<div><div class="annotator-wrapper"/></div>'), true);
    expect(spy.calledOnce).to.be.true;
    expect(tj.store).to.have.lengthOf(0);
  });
});

// ---------------------------------------------------------------------------
// setUpListeners — inline mode
// ---------------------------------------------------------------------------
describe('TempJSON setUpListeners (inline mode)', function() {
  let clock;
  beforeEach(function() { clock = sinon.useFakeTimers(); });
  afterEach(function() { clock.restore(); });

  it('loads annotations from data-annotations attribute without HTTP', function() {
    const inlineEl = document.createElement('div');
    inlineEl.id = 'annotations-url';
    const fakeAnnotations = [{
      id: 'inline-ann-1',
      type: 'Annotation',
      body: { type: 'List', items: [] },
      target: { type: 'List', items: [{ type: 'Text', selector: { type: 'Choice', items: [] } }] },
      creator: { id: 'u1', name: 'user' },
      created: '2024-01-01T00:00:00Z',
      permissions: {},
    }];
    inlineEl.setAttribute('data-annotations', JSON.stringify(fakeAnnotations));
    document.body.appendChild(inlineEl);

    const opts = Object.assign({}, BASE_OPTIONS, {
      storageOptions: {
        external_url: { inline_mode: true, json_url: '' }
      }
    });

    const tj = new Hxighlighter.TempJSON(opts, 'inline-inst');
    expect(tj.store).to.have.lengthOf(1);
    expect(tj.store[0].id).to.equal('inline-ann-1');

    document.body.removeChild(inlineEl);
  });
});

// ---------------------------------------------------------------------------
// setUpListeners — AJAX mode
// ---------------------------------------------------------------------------
describe('TempJSON setUpListeners (AJAX mode)', function() {
  let ajaxStub;

  beforeEach(function() {
    ajaxStub = sinon.stub(jQuery, 'ajax');
  });

  afterEach(function() {
    ajaxStub.restore();
  });

  it('calls $.ajax with the configured json_url', function() {
    const opts = Object.assign({}, BASE_OPTIONS, {
      storageOptions: {
        external_url: { inline_mode: false, json_url: 'http://example.com/annotations.json' }
      }
    });
    new Hxighlighter.TempJSON(opts, 'ajax-inst');
    expect(ajaxStub.calledOnce).to.be.true;
    expect(ajaxStub.firstCall.args[0].url).to.equal('http://example.com/annotations.json');
  });

  it('does not call $.ajax when json_url is empty', function() {
    new Hxighlighter.TempJSON(BASE_OPTIONS, 'noop-inst');
    expect(ajaxStub.called).to.be.false;
  });
});

// ---------------------------------------------------------------------------
// getElementViaXpath
// ---------------------------------------------------------------------------
describe('TempJSON#getElementViaXpath', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('resolves a simple xpath to the correct element', function() {
    const container = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = 'target text';
    container.appendChild(p);
    document.body.appendChild(container);

    const found = tj.getElementViaXpath('/p[1]', container);
    expect(found).to.equal(p);

    document.body.removeChild(container);
  });

  it('returns null for an xpath that does not match', function() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const found = tj.getElementViaXpath('/section[99]', container);
    expect(found).to.be.null;

    document.body.removeChild(container);
  });
});

// ---------------------------------------------------------------------------
// flatten
// ---------------------------------------------------------------------------
describe('TempJSON#flatten', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns a flat array from a nested array', function() {
    expect(tj.flatten([[1, 2], [3, [4, 5]]])).to.deep.equal([1, 2, 3, 4, 5]);
  });

  it('returns the same array when already flat', function() {
    expect(tj.flatten([1, 2, 3])).to.deep.equal([1, 2, 3]);
  });

  it('handles an empty array', function() {
    expect(tj.flatten([])).to.deep.equal([]);
  });

  it('handles mixed falsy values without throwing', function() {
    expect(tj.flatten([0, null, false, 1])).to.deep.equal([0, null, false, 1]);
  });
});

// ---------------------------------------------------------------------------
// contains
// ---------------------------------------------------------------------------
describe('TempJSON#contains', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns truthy when elem2 is contained within elem1', function() {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    expect(tj.contains(parent, child)).to.be.ok;

    document.body.removeChild(parent);
  });

  it('returns falsy when elem2 is not contained within elem1', function() {
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.appendChild(a);
    document.body.appendChild(b);

    expect(tj.contains(a, b)).to.not.be.ok;

    document.body.removeChild(a);
    document.body.removeChild(b);
  });
});

// ---------------------------------------------------------------------------
// StorageAnnotationUpdate (direct)
// ---------------------------------------------------------------------------
describe('TempJSON#StorageAnnotationUpdate', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('does not grow the store when updating an existing entry', function() {
    const elem = jQuery('<div><div class="annotator-wrapper"/></div>');
    tj.StorageAnnotationSave(Object.assign({}, INTERNAL_ANN), elem, false);
    expect(tj.store).to.have.lengthOf(1);

    tj.StorageAnnotationUpdate(Object.assign({}, INTERNAL_ANN, { annotationText: ['Updated text'] }), elem);
    expect(tj.store).to.have.lengthOf(1);
  });
});

// ---------------------------------------------------------------------------
// convertToWebAnnotation — comment/reply branch (media === 'comment')
// ---------------------------------------------------------------------------
describe('TempJSON#convertToWebAnnotation (comment/reply)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('sets purpose to replying for comment-media annotations', function() {
    const commentAnn = {
      id: 'reply-001',
      created: new Date('2024-01-01T00:00:00Z'),
      annotationText: ['A reply'],
      tags: [],
      media: 'comment',
      ranges: { source: 'parent-ann-id' },
    };
    const wa = tj.convertToWebAnnotation(commentAnn, jQuery('<div class="annotator-wrapper"/>'));
    const bodyItem = wa.body.items.find(item => item.purpose === 'replying');
    expect(bodyItem).to.exist;
    expect(bodyItem.value).to.equal('A reply');
  });

  it('uses ranges.source as the target source id for replies', function() {
    const commentAnn = {
      id: 'reply-002',
      created: new Date(),
      annotationText: ['Reply text'],
      tags: [],
      media: 'comment',
      ranges: { source: 'parent-ann-id' },
    };
    const wa = tj.convertToWebAnnotation(commentAnn, jQuery('<div class="annotator-wrapper"/>'));
    expect(wa.platform.target_source_id).to.equal('parent-ann-id');
  });
});

// ---------------------------------------------------------------------------
// Empty-body stubs — just confirm they don't throw
// ---------------------------------------------------------------------------
describe('TempJSON stub methods (empty bodies)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('onLoad does not throw', function() {
    expect(() => tj.onLoad(document.createElement('div'), {})).to.not.throw();
  });

  it('search does not throw', function() {
    expect(() => tj.search({}, function() {}, function() {})).to.not.throw();
  });

  it('StorageAnnotationDelete does not throw', function() {
    expect(() => tj.StorageAnnotationDelete(INTERNAL_ANN, document.createElement('div'))).to.not.throw();
  });

  it('storeCurrent does not throw', function() {
    expect(() => tj.storeCurrent()).to.not.throw();
  });
});

// ---------------------------------------------------------------------------
// getTextNodes / getTextNodesFromRange / text
// ---------------------------------------------------------------------------
describe('TempJSON#getTextNodes', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns text nodes from a simple element', function() {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const nodes = tj.getTextNodes(jQuery(div));
    // jQuery .map flattens one level; flatten again via the method itself
    const flat = tj.flatten(nodes.toArray());
    expect(flat.some(n => n && n.nodeValue === 'hello')).to.be.true;

    document.body.removeChild(div);
  });

  it('handles a nested element structure', function() {
    const div = document.createElement('div');
    div.innerHTML = '<p>first</p><p>second</p>';
    document.body.appendChild(div);

    const nodes = tj.getTextNodes(jQuery(div));
    const flat = tj.flatten(nodes.toArray());
    const values = flat.filter(Boolean).map(n => n.nodeValue);
    expect(values).to.include.members(['first', 'second']);

    document.body.removeChild(div);
  });
});

// ---------------------------------------------------------------------------
// Error/catch branch coverage — malformed input triggers each catch block
// ---------------------------------------------------------------------------
describe('TempJSON error fallbacks', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('getAnnotationText returns "" when body is missing', function() {
    expect(tj.getAnnotationText({ body: undefined })).to.equal('');
  });

  it('getAnnotationCreator returns unknown object when webAnn is null', function() {
    expect(tj.getAnnotationCreator(null)).to.deep.equal({ name: 'Unknown', id: 'error' });
  });

  it('getAnnotationExact returns "" when target is missing', function() {
    expect(tj.getAnnotationExact({ target: undefined })).to.equal('');
  });

  it('getAnnotationId returns "" when webAnn is null', function() {
    expect(tj.getAnnotationId(null)).to.equal('');
  });

  it('getAnnotationTags returns [] when body is missing', function() {
    expect(tj.getAnnotationTags({ body: undefined })).to.deep.equal([]);
  });

  it('getAnnotationTargetItems returns [] when target is missing', function() {
    expect(tj.getAnnotationTargetItems({})).to.deep.equal([]);
  });
});

// ---------------------------------------------------------------------------
// getAnnotationTargetItems — "Annotation" type branch (reply/comment target)
// ---------------------------------------------------------------------------
describe('TempJSON#getAnnotationTargetItems (Annotation type)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns a parent-keyed array when target type is "Annotation"', function() {
    const webAnn = {
      target: { items: [{ type: 'Annotation', source: 'parent-ann-id' }] }
    };
    const result = tj.getAnnotationTargetItems(webAnn);
    expect(result).to.deep.equal([{ parent: 'parent-ann-id' }]);
  });
});

// ---------------------------------------------------------------------------
// getAnnotationTarget — "Annotation" type flows parent range through
// ---------------------------------------------------------------------------
describe('TempJSON#getAnnotationTarget (Annotation type)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns the parent range when target type is "Annotation"', function() {
    const webAnn = {
      target: { items: [{ type: 'Annotation', source: 'parent-ann-id' }] }
    };
    const result = tj.getAnnotationTarget(webAnn, jQuery('<div/>'));
    expect(result).to.deep.equal([{ parent: 'parent-ann-id' }]);
  });
});

// ---------------------------------------------------------------------------
// StorageAnnotationUpdate — non-matching branch
// ---------------------------------------------------------------------------
describe('TempJSON#StorageAnnotationUpdate (non-matching branch)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('leaves non-matching annotations in the store untouched', function() {
    const elem = jQuery('<div><div class="annotator-wrapper"/></div>');
    const ann1 = Object.assign({}, INTERNAL_ANN, { id: 'ann-001' });
    const ann2 = Object.assign({}, INTERNAL_ANN, { id: 'ann-002' });
    tj.StorageAnnotationSave(ann1, elem, false);
    tj.StorageAnnotationSave(ann2, elem, false);

    tj.StorageAnnotationUpdate(Object.assign({}, INTERNAL_ANN, { id: 'ann-001', annotationText: ['Updated'] }), elem);

    // ann-002 must still be in the store
    expect(tj.store.some(a => a.id === 'ann-002')).to.be.true;
    expect(tj.store).to.have.lengthOf(2);
  });
});

// ---------------------------------------------------------------------------
// setUpListeners AJAX — success callback invoked via sinon yieldsTo
// ---------------------------------------------------------------------------
describe('TempJSON setUpListeners (AJAX success callback)', function() {
  let clock;
  beforeEach(function() { clock = sinon.useFakeTimers(); });
  afterEach(function() { clock.restore(); });

  it('populates the store when success callback is invoked with data', function() {
    const fakeData = {
      rows: [{
        id: 'ajax-ann-1',
        type: 'Annotation',
        body: { type: 'List', items: [] },
        target: { type: 'List', items: [{ type: 'Text', selector: { type: 'Choice', items: [] } }] },
        creator: { id: 'u1', name: 'user' },
        created: '2024-01-01T00:00:00Z',
        permissions: {},
      }]
    };

    const ajaxStub = sinon.stub(jQuery, 'ajax').yieldsTo('success', fakeData);

    const opts = Object.assign({}, BASE_OPTIONS, {
      storageOptions: {
        external_url: { inline_mode: false, json_url: 'http://example.com/annotations.json' }
      }
    });

    const tj = new Hxighlighter.TempJSON(opts, 'ajax-success-inst');
    expect(ajaxStub.calledOnce).to.be.true;
    expect(tj.store).to.have.lengthOf(1);
    expect(tj.store[0].id).to.equal('ajax-ann-1');

    ajaxStub.restore();
  });
});

// ---------------------------------------------------------------------------
// setUpListeners outer catch — bad storageOptions triggers the catch block
// ---------------------------------------------------------------------------
describe('TempJSON setUpListeners (outer catch)', function() {
  it('does not throw when storageOptions access fails', function() {
    const badOpts = new Proxy(BASE_OPTIONS, {
      get(target, key) {
        if (key === 'storageOptions') throw new Error('forced storageOptions error');
        return target[key];
      }
    });
    expect(() => new Hxighlighter.TempJSON(badOpts, 'proxy-inst')).to.not.throw();
  });
});

// ---------------------------------------------------------------------------
// getAnnotationCreated — valid and invalid date inputs
// ---------------------------------------------------------------------------
describe('TempJSON#getAnnotationCreated', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns the parsed date when created is a valid ISO string', function() {
    const result = tj.getAnnotationCreated({ created: '2024-01-15T00:00:00Z' });
    expect(result).to.be.instanceOf(Date);
    expect(result.getFullYear()).to.equal(2024);
  });

  it('returns a fallback current Date when created is not a valid date string', function() {
    const result = tj.getAnnotationCreated({ created: 'not-a-date' });
    expect(result).to.be.instanceOf(Date);
    expect(isNaN(result.getTime())).to.be.false;
  });
});

// ---------------------------------------------------------------------------
// contains — return false branch when compareDocumentPosition is null
// ---------------------------------------------------------------------------
describe('TempJSON#contains (return false branch)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns false when document.compareDocumentPosition is null', function() {
    const orig = document.compareDocumentPosition;
    document.compareDocumentPosition = null;
    const a = document.createElement('div');
    const b = document.createElement('div');
    expect(tj.contains(a, b)).to.equal(false);
    document.compareDocumentPosition = orig;
  });
});

// ---------------------------------------------------------------------------
// getTextNodesFromRange + text — fake NormalizedRange shape
// ---------------------------------------------------------------------------
describe('TempJSON#getTextNodesFromRange', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns text nodes for a fake NormalizedRange', function() {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const fakeRange = {
      commonAncestorContainer: div,
      start: div.firstChild,
      end: div.firstChild,
    };
    const nodes = tj.getTextNodesFromRange(fakeRange);
    expect(nodes.length).to.be.at.least(1);

    document.body.removeChild(div);
  });
});

describe('TempJSON#text', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('extracts nodeValue from a fake NormalizedRange', function() {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const fakeRange = {
      commonAncestorContainer: div,
      start: div.firstChild,
      end: div.firstChild,
    };
    expect(tj.text(fakeRange)).to.equal('hello');

    document.body.removeChild(div);
  });
});

// ---------------------------------------------------------------------------
// serializeRanges — catch path (plain JSDOM Range, no .serialize method)
// ---------------------------------------------------------------------------
describe('TempJSON#serializeRanges (hrange fallback path)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('falls back to hrange.serializeRange for a plain DOM Range', function() {
    const wrapper = document.createElement('div');
    wrapper.className = 'annotator-wrapper';
    const p = document.createElement('p');
    p.textContent = 'Hello world';
    wrapper.appendChild(p);
    document.body.appendChild(wrapper);

    const range = document.createRange();
    range.setStart(p.firstChild, 0);
    range.setEnd(p.firstChild, 5);
    // Give the range a .text() method so serializeRanges takes the direct branch
    // (avoiding the annotatorjs-only self.text() path which needs .start/.end).
    range.text = function() { return this.toString(); };

    const result = tj.serializeRanges([range], jQuery(wrapper));
    expect(result.serial).to.have.lengthOf(1);
    expect(result.extra[0].exact).to.equal('Hello');

    document.body.removeChild(wrapper);
  });

  it('returns empty ranges object when called with empty array', function() {
    const tj2 = makeTempJSON();
    const result = tj2.serializeRanges([], jQuery('<div/>'));
    expect(result).to.deep.equal({ ranges: [] });
  });
});

// ---------------------------------------------------------------------------
// normalizeRanges — serialized JSON input → live Range objects
// ---------------------------------------------------------------------------
describe('TempJSON#normalizeRanges', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('returns a live Range from serialized xpath range data', function() {
    const wrapper = document.createElement('div');
    wrapper.className = 'annotator-wrapper';
    const p = document.createElement('p');
    p.textContent = 'Hello world';
    wrapper.appendChild(p);
    document.body.appendChild(wrapper);

    const serialized = [{
      xpath: { start: '/p[1]', startOffset: 0, end: '/p[1]', endOffset: 5 },
      position: { globalStartOffset: 0, globalEndOffset: 5 },
      text: { prefix: '', exact: 'Hello', suffix: ' world' },
    }];

    const result = tj.normalizeRanges(serialized, jQuery(wrapper));
    expect(result).to.have.lengthOf(1);
    expect(result[0].toString()).to.equal('Hello');

    document.body.removeChild(wrapper);
  });
});

// ---------------------------------------------------------------------------
// getAnnotationTarget — xpath-only fallback (RangeSelector only, no position/quote)
// ---------------------------------------------------------------------------
describe('TempJSON#getAnnotationTarget (xpath-only fallback)', function() {
  let tj;
  beforeEach(function() { tj = makeTempJSON(); });

  it('resolves an xpath-only annotation target via hrange fallback', function() {
    const wrapper = document.createElement('div');
    wrapper.className = 'annotator-wrapper';
    const p = document.createElement('p');
    p.textContent = 'Hello world';
    wrapper.appendChild(p);
    document.body.appendChild(wrapper);

    const webAnn = {
      target: {
        items: [{
          type: 'Text',
          selector: {
            type: 'Choice',
            items: [{
              type: 'RangeSelector',
              startSelector: { type: 'XPathSelector', value: '/p[1]' },
              endSelector: { type: 'XPathSelector', value: '/p[1]' },
              refinedBy: { type: 'TextPositionSelector', start: 0, end: 5 },
            }]
          }
        }]
      }
    };

    const result = tj.getAnnotationTarget(webAnn, jQuery(wrapper));
    expect(result).to.have.lengthOf(1);

    document.body.removeChild(wrapper);
  });
});
