import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {resolveAchievedByTechniqueIds} from './achieved-by-property';

const techniques = [
    {id: 'cap-aq', slug: 'aq-coating-aqueous'},
    {id: 'cap-uv', slug: 'uv-coating'},
];

describe('resolveAchievedByTechniqueIds', () => {
    it('maps a technique slug to its id', () => {
        assert.deepEqual(
            resolveAchievedByTechniqueIds(techniques, ['aq-coating-aqueous']),
            ['cap-aq'],
        );
    });

    it('accepts an already-resolved technique id', () => {
        assert.deepEqual(resolveAchievedByTechniqueIds(techniques, ['cap-uv']), [
            'cap-uv',
        ]);
    });

    it('drops unknown values so Need consultation is not faked', () => {
        assert.deepEqual(
            resolveAchievedByTechniqueIds(techniques, ['not-a-technique']),
            [],
        );
        assert.deepEqual(resolveAchievedByTechniqueIds(undefined, ['aq']), []);
    });
});
