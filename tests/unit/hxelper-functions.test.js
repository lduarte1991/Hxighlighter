import {expect} from "chai";
import jQuery from 'jquery';

import Hxighlighter from '../../src/js/hxighlighter.js';
import '../../src/js/hxelper-functions';

describe('Hxighlighter Helper Functions', function() {

    before(function() {
        var root = global || window;
        root.jQuery = jQuery;
    });

    it('should return a valid uuid', function() {
        expect(Hxighlighter.getUniqueId()).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i);
    });

    it('should check to see if an object exists', function() {
        expect(Hxighlighter.exists(undefined)).to.be.false;
        expect(Hxighlighter.exists({})).to.not.be.false;
    });

    it('should trim strings with empty spaces', function() {
        expect(Hxighlighter.trim('   abcd    ')).to.equal('abcd');
    });
});