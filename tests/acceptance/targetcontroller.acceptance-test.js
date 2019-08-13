const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('Text Annotation Target Area', function() {
    let browser;
    let page;

    before(async function() {
        browser = await puppeteer.launch();
        page = await browser.newPage();
    });

    beforeEach(async function() {
        page = await browser.newPage();
        await page.goto('http://localhost:9000')
    });

    afterEach(async function() {
        await page.close();
    });

    after (async function() {
        await browser.close();
    });

    it('should have an annotator-wrapper', async function() {
        const wrapper = await page.evaluate(async() => {
            return document.getElementsByClassName('annotator-wrapper')[0];
        });
        expect(wrapper).to.exist;
    });
    
    it('should have an id associated with it', async function() {
        const text = await page.evaluate(async() => {
            return document.getElementsByClassName('annotation-slot')[0].getAttribute('id');
        });
        expect(text).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i);
    });

    it('should contain text content', async function() {
        const text = await page.evaluate(async() => {
            return document.getElementsByClassName('annotator-wrapper')[0].innerHTML;
        });

        expect(text).to.exist;
        expect(text).to.not.equal('');
        expect(text.length).to.be.above(0);
    });

    it('should contain the CORRECT text content', async function() {
        const text = await page.evaluate(async() => {
            return document.getElementsByClassName('annotator-wrapper')[0].innerHTML;
        });

        expect(text).to.have.string('upon a midnight dreary,');
        expect(text).to.have.string('I betook myself to linking');
        expect(text).to.have.string('lies floating on the floor');
        expect(text).to.not.have.string('Nemo me impune lacessit');
    });
});