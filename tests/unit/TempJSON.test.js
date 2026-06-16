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
