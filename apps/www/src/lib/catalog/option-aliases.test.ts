import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {resolveOptionAliases} from './option-aliases';

describe('resolveOptionAliases (PROD-3207)', () => {
    it('uses alsoKnownAs when the checkbox is off', () => {
        assert.deepEqual(
            resolveOptionAliases({
                alsoKnownAs: ['AQ', 'Water-based coating'],
                conceptAliases: ['Coating'],
            }),
            ['AQ', 'Water-based coating'],
        );
    });

    it('uses conceptAliases when the checkbox is on — even if alsoKnownAs is set', () => {
        assert.deepEqual(
            resolveOptionAliases({
                inheritAliasesFromConcept: true,
                alsoKnownAs: ['Should not win'],
                conceptAliases: ['Laminating'],
            }),
            ['Laminating'],
        );
    });

    it('returns an empty list when the chosen source is empty (no fallback)', () => {
        assert.deepEqual(
            resolveOptionAliases({
                inheritAliasesFromConcept: true,
                alsoKnownAs: ['Option list'],
                conceptAliases: [],
            }),
            [],
        );
        assert.deepEqual(
            resolveOptionAliases({
                alsoKnownAs: [],
                conceptAliases: ['Concept list'],
            }),
            [],
        );
    });
});
