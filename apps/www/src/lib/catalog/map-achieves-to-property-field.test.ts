import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    ACHIEVES_PROPERTY_KEY,
    achievesFieldLabel,
    mapAchievesToPropertyField,
} from './map-achieves-to-property-field';
import type {AchievedByOption} from './types';

function target(
    partial: Pick<AchievedByOption, 'id' | 'title'> &
        Partial<AchievedByOption>,
): AchievedByOption {
    return partial;
}

describe('mapAchievesToPropertyField', () => {
    it('returns null when the list is empty', () => {
        assert.equal(mapAchievesToPropertyField(undefined), null);
        assert.equal(mapAchievesToPropertyField([]), null);
    });

    it('builds a single radio group from Achieves targets', () => {
        const field = mapAchievesToPropertyField([
            target({
                id: 'opt-gloss',
                title: 'Gloss',
                typeTitle: 'Finish',
                slug: 'gloss',
                categorySlug: 'finishing',
            }),
            target({
                id: 'opt-matte',
                title: 'Matte',
                typeTitle: 'Finish',
            }),
        ]);
        assert.ok(field);
        assert.equal(field.propertyKey, ACHIEVES_PROPERTY_KEY);
        assert.equal(field.kind, 'radio');
        assert.equal(field.valuesPerItem, 'one');
        assert.equal(field.label, 'Achievable Finishes');
        assert.deepEqual(
            field.options.map((o) => o.title),
            ['Gloss', 'Matte'],
        );
    });

    it('falls back to Achievable options when type titles differ', () => {
        assert.equal(
            achievesFieldLabel([
                target({id: 'a', title: 'A', typeTitle: 'Finish'}),
                target({id: 'b', title: 'B', typeTitle: 'Coating'}),
            ]),
            'Achievable options',
        );
    });
});
