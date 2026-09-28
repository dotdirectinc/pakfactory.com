import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {toLifecycle} from './types';

// Richard's baseline (2026-09-28): an unset or unknown status is the normal one.
describe('toLifecycle', () => {
    it('keeps coming-soon and discontinued', () => {
        assert.equal(toLifecycle('coming-soon'), 'coming-soon');
        assert.equal(toLifecycle('discontinued'), 'discontinued');
    });
    it('reads active, unset and anything unknown as active', () => {
        for (const s of ['active', null, undefined, '', 'draft']) assert.equal(toLifecycle(s), 'active');
    });
});
