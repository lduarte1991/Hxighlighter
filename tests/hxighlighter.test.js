import { expect } from "chai";

import Hxighlighter from '../src/js/hxighlighter.js';
import '../src/js/core.js';
import '../src/js/hxelper-functions.js';

describe('Hxighlighter', function() {
    it('should return a defined Hxighlighter object', function () {
        expect(Hxighlighter).to.exist;
    });

    it('instantiates lists', function () {
        expect(Hxighlighter.selectors).to.exist;
        expect(Hxighlighter.drawers).to.exist;
        expect(Hxighlighter.selectors).to.exist;
    });

    it('instantiates required events list', function () {
        expect(Hxighlighter.requiredEvents).to.exist;
        expect(Hxighlighter.requiredEvents.length).to.equal(14);
        expect(Hxighlighter.requiredEvents).to.include.members(['TargetAnnotationDraw', 'StorageAnnotationGetReplies']);
    });

    it('is not created if no options passed in', function() {
        Hxighlighter();
        expect(Hxighlighter._instances).to.not.exist;
    });

    it('contains one instance', function () {
        Hxighlighter({
            "commonInfo": {
                "mediaType": "text",
                "context_id": "fake-course-id",
                "collection_id": "e-a-poe-section",
                "object_id": "the-raven-id",
                "username": "lduarte1991",
                "user_id": "fake-anonymous-id",
            },
            "targets": [{
                'mediaType': "text",
                'method': 'url',
                'object_source': 'http://127.0.0.1:8080/sample_targets/raven.txt',
                'target_selector': '.hxighlighter-container',
                "template_urls": 'http://127.0.0.1:8080/src/js/viewers/templates/',
            }],
        });
        expect(Hxighlighter._instanceIDs.length).to.equal(1);
    });

    it('contains two instances instead of replacing old one', function () {
        Hxighlighter({
            "commonInfo": {
                "mediaType": "text",
                "object_id": "the-raven-id",
                "username": "lduarte1991",
                "user_id": "fake-anonymous-id",
            },
            "targets": [{
                'mediaType': "text",
                'method': 'url',
                'object_source': 'http://127.0.0.1:8080/sample_targets/raven.txt',
                'target_selector': '.hxighlighter-container',
                "template_urls": 'http://127.0.0.1:8080/src/js/viewers/templates/',
            }],
        });
        expect(Hxighlighter._instanceIDs.length).to.equal(2);
    });

    it

    it('will give object a unique id if not provided information relevant', function() {
        expect(Hxighlighter._instanceIDs[1]).to.not.have.string('the-raven-id');
    });

    it('save objec t with given instantiation id if provided', function () {
        Hxighlighter({
            "inst_id": "important_inst_id",
            "commonInfo": {
                "mediaType": "text",
                "username": "lduarte1991",
                "user_id": "fake-anonymous-id",
            },
            "targets": [{
                'mediaType': "text",
                'method': 'url',
                'object_source': 'http://127.0.0.1:8080/sample_targets/raven.txt',
                'target_selector': '.hxighlighter-container',
                "template_urls": 'http://127.0.0.1:8080/src/js/viewers/templates/',
            }],
        });
        expect(Hxighlighter._instanceIDs[2]).to.equal('important_inst_id');
    });

    it('has a core object', function() {
        expect(Hxighlighter._instances[Hxighlighter._instanceIDs[0]].core).to.exist;
    });
});