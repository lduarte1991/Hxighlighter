import { expect } from 'chai';
import { JSDOM } from 'jsdom';

import {
  serializeRange,
  normalizeRange,
  getGlobalOffset,
  getNodeFromXpath,
  getTextNodesFromAnnotationRanges,
} from '../../src/js/core/h-range.js';

// Builds a fresh JSDOM document with an .annotator-wrapper inside a root div.
// Returns { root, wrapper, doc } so tests can construct ranges against wrapper.
function makeDOM(innerHtml) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="root"><div class="annotator-wrapper">${innerHtml}</div></div>
  </body></html>`);
  const doc = dom.window.document;
  // h-range uses bare globals for document.createRange etc — point them at this doc
  global.document = doc;
  global.Node = dom.window.Node;
  const root = doc.getElementById('root');
  const wrapper = root.querySelector('.annotator-wrapper');
  return { root, wrapper, doc };
}

// Creates a Range spanning from startNode[startOffset] to endNode[endOffset].
function makeRange(doc, startNode, startOffset, endNode, endOffset) {
  const range = doc.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

describe('h-range', function () {

  describe('serializeRange()', function () {
    it('captures the exact selected text', function () {
      const { root, wrapper, doc } = makeDOM('<p>Hello world</p>');
      const p = wrapper.querySelector('p');
      const textNode = p.firstChild;
      const range = makeRange(doc, textNode, 6, textNode, 11); // "world"
      const result = serializeRange(range, root, 'annotator-hl');
      expect(result.text.exact).to.equal('world');
    });

    it('returns an xpath, text, and position object', function () {
      const { root, wrapper, doc } = makeDOM('<p>Hello world</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 0, textNode, 5); // "Hello"
      const result = serializeRange(range, root, 'annotator-hl');
      expect(result).to.have.all.keys('xpath', 'text', 'position');
      expect(result.xpath).to.have.all.keys('start', 'startOffset', 'end', 'endOffset');
      expect(result.text).to.have.all.keys('prefix', 'exact', 'suffix');
      expect(result.position).to.have.all.keys('globalStartOffset', 'globalEndOffset');
    });

    it('captures prefix context (up to 35 chars before selection)', function () {
      const { root, wrapper, doc } = makeDOM('<p>The quick brown fox jumps</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 16, textNode, 19); // "fox"
      const result = serializeRange(range, root, 'annotator-hl');
      expect(result.text.prefix).to.include('quick brown ');
      expect(result.text.exact).to.equal('fox');
    });

    it('captures suffix context (up to 35 chars after selection)', function () {
      const { root, wrapper, doc } = makeDOM('<p>The quick brown fox jumps over</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 16, textNode, 19); // "fox"
      const result = serializeRange(range, root, 'annotator-hl');
      expect(result.text.suffix).to.include(' jumps over');
    });

    it('globalEndOffset is greater than globalStartOffset', function () {
      const { root, wrapper, doc } = makeDOM('<p>Some text here</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 5, textNode, 9); // "text"
      const result = serializeRange(range, root, 'annotator-hl');
      expect(result.position.globalEndOffset).to.be.greaterThan(result.position.globalStartOffset);
    });
  });

  describe('getGlobalOffset()', function () {
    it('returns numeric start and end offsets', function () {
      const { root, wrapper, doc } = makeDOM('<p>abcdef</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 2, textNode, 5); // "cde"
      const result = getGlobalOffset(range, root);
      expect(result.startOffset).to.be.a('number');
      expect(result.endOffset).to.be.a('number');
    });

    it('end offset minus start offset equals selection length', function () {
      const { root, wrapper, doc } = makeDOM('<p>abcdef</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 1, textNode, 4); // "bcd" (length 3)
      const result = getGlobalOffset(range, root);
      expect(result.endOffset - result.startOffset).to.equal(3);
    });
  });

  describe('getNodeFromXpath()', function () {
    it('resolves a simple xpath back to the correct element', function () {
      const { wrapper } = makeDOM('<p>first</p><p>second</p>');
      // xpath for the second <p> would be "/p[2]", offset 0
      const result = getNodeFromXpath(wrapper, '/p[2]', 0, 'annotator-hl');
      expect(result).to.exist;
      expect(result.node.textContent).to.include('second');
    });

    it('resolves offset within a text node', function () {
      const { wrapper } = makeDOM('<p>hello</p>');
      // xpath "/" means the text is directly under wrapper; offset 3 = after "hel"
      const result = getNodeFromXpath(wrapper, '/p[1]', 3, 'annotator-hl');
      expect(result).to.exist;
      expect(result.offset).to.equal(3);
    });

    it('skips nodes matching ignoreSelector', function () {
      const { wrapper } = makeDOM(
        '<p class="annotator-hl">skip</p><p>real</p>'
      );
      // Without ignoring, p[1] would be the annotator-hl paragraph.
      // With ignoreSelector, it should skip to the real one.
      const result = getNodeFromXpath(wrapper, '/p[1]', 0, 'annotator-hl');
      expect(result).to.exist;
      expect(result.node.textContent).to.include('real');
    });
  });

  describe('normalizeRange()', function () {
    it('round-trips: normalize(serialize(range)) reproduces the same text', function () {
      const { root, wrapper, doc } = makeDOM('<p>The raven never more</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 4, textNode, 9); // "raven"
      const serialized = serializeRange(range, root, 'annotator-hl');
      const restored = normalizeRange(serialized, root, 'annotator-hl');
      expect(restored.toString()).to.equal('raven');
    });

    it('returns a Range object with start and end containers', function () {
      const { root, wrapper, doc } = makeDOM('<p>Once upon a time</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 5, textNode, 9); // "upon"
      const serialized = serializeRange(range, root, 'annotator-hl');
      const restored = normalizeRange(serialized, root, 'annotator-hl');
      expect(restored.startContainer).to.exist;
      expect(restored.endContainer).to.exist;
    });

    it('falls back to global offset when xpath text does not match', function () {
      const { root, wrapper, doc } = makeDOM('<p>Quoth the raven</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 10, textNode, 15); // "raven"
      const serialized = serializeRange(range, root, 'annotator-hl');
      // Corrupt the xpath to force Way 2 fallback
      serialized.xpath.start = '/bogus[1]';
      serialized.xpath.end = '/bogus[1]';
      const restored = normalizeRange(serialized, root, 'annotator-hl');
      expect(restored.toString()).to.equal('raven');
    });

    it('falls back to exact text search when xpath and global offset both fail', function () {
      const { root, wrapper, doc } = makeDOM('<p>Quoth the raven nevermore</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 10, textNode, 15); // "raven"
      const serialized = serializeRange(range, root, 'annotator-hl');
      // Force Way 3: corrupt xpath and shift global offsets far off
      serialized.xpath.start = '/bogus[1]';
      serialized.xpath.end = '/bogus[1]';
      serialized.position.globalStartOffset = 999;
      serialized.position.globalEndOffset = 999;
      const restored = normalizeRange(serialized, root, 'annotator-hl');
      expect(restored.toString()).to.equal('raven');
    });
  });

  describe('getTextNodesFromAnnotationRanges()', function () {
    it('returns text nodes covering the annotated range', function () {
      const { root, wrapper, doc } = makeDOM('<p>Hello world</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range = makeRange(doc, textNode, 6, textNode, 11); // "world"
      const serialized = serializeRange(range, root, 'annotator-hl');
      const nodes = getTextNodesFromAnnotationRanges([serialized], root);
      expect(nodes.length).to.be.greaterThan(0);
      const combined = nodes.map(n => n.textContent || n.nodeValue || '').join('');
      expect(combined).to.include('world');
    });

    it('handles multiple ranges and concatenates results', function () {
      const { root, wrapper, doc } = makeDOM('<p>one two three</p>');
      const textNode = wrapper.querySelector('p').firstChild;
      const range1 = makeRange(doc, textNode, 0, textNode, 3); // "one"
      const range2 = makeRange(doc, textNode, 8, textNode, 13); // "three"
      const s1 = serializeRange(range1, root, 'annotator-hl');
      const s2 = serializeRange(range2, root, 'annotator-hl');
      const nodes = getTextNodesFromAnnotationRanges([s1, s2], root);
      expect(nodes.length).to.be.greaterThan(1);
    });
  });

});
