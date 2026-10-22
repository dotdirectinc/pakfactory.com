import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {ACHIEVED_BY_PROPERTY_KEY} from '@/lib/catalog/achieved-by-property';
import type {Product} from '@/lib/catalog/types';
import {EMPTY_BUILDER_STATE} from '@/lib/customization-builder';

import {applyCompatibilityQuery} from './compatibility-preselect';

const glossId = 'opt-gloss';
const aqId = 'cap-aq';

const product = {
    availableCustomizations: [
        {
            id: glossId,
            label: 'Gloss',
            slug: 'gloss',
            category: 'finishing',
            typeId: 'type-surface-finish',
            customerSelects: 'one',
            achievedBy: [
                {
                    id: aqId,
                    title: 'AQ Coating (Aqueous)',
                    slug: 'aq-coating-aqueous',
                },
            ],
        },
    ],
} as Product;

describe('applyCompatibilityQuery achievedBy', () => {
    it('seeds Gloss and maps finishing.achievedBy slug to the technique id', () => {
        const result = applyCompatibilityQuery(
            product,
            EMPTY_BUILDER_STATE,
            new URLSearchParams(
                'finishing=gloss&finishing.achievedBy=aq-coating-aqueous',
            ),
        );
        assert.ok(result);
        const picks = result.state.answers.finishing;
        assert.equal(picks?.status, 'set');
        assert.ok(picks && 'selections' in picks);
        assert.equal(picks.selections[0]?.optionId, glossId);
        assert.deepEqual(
            result.state.propertySelections?.[glossId]?.[
                ACHIEVED_BY_PROPERTY_KEY
            ],
            [aqId],
        );
    });

    it('ignores an unknown technique slug', () => {
        const result = applyCompatibilityQuery(
            product,
            EMPTY_BUILDER_STATE,
            new URLSearchParams(
                'finishing=gloss&finishing.achievedBy=not-a-technique',
            ),
        );
        assert.ok(result);
        assert.equal(
            result.state.propertySelections?.[glossId]?.[
                ACHIEVED_BY_PROPERTY_KEY
            ],
            undefined,
        );
    });
});
