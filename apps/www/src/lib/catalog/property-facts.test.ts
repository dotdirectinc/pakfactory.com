import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {presentPropertyFact, specTableColumns} from './property-facts';

describe('presentPropertyFact', () => {
    it('renders the label title and unit for a number fact (PROD-3055)', () => {
        assert.deepEqual(presentPropertyFact({label: 'caliper', value: 12}), {
            key: 'caliper',
            label: 'Caliper',
            display: '12pt',
        });
    });

    it('uses the symbol when the label defines one', () => {
        assert.deepEqual(presentPropertyFact({label: 'fluteHeight', value: 0.125}), {
            key: 'fluteHeight',
            label: 'Thickness',
            display: '0.125"',
        });
    });

    it('keeps text facts as written', () => {
        assert.deepEqual(
            presentPropertyFact({label: 'commonlyUsedFor', text: 'light folding cartons'}),
            {
                key: 'commonlyUsedFor',
                label: 'Commonly used for',
                display: 'light folding cartons',
            },
        );
    });

    it('keeps an unknown slug as both key and heading', () => {
        assert.deepEqual(presentPropertyFact({label: 'legacy', value: 4}), {
            key: 'legacy',
            label: 'legacy',
            display: '4',
        });
    });
});

describe('specTableColumns', () => {
    it('orders columns from the number list, then the text list', () => {
        const columns = specTableColumns([
            {key: 'commonlyUsedFor', label: 'Commonly used for'},
            {key: 'caliper', label: 'Caliper'},
            {key: 'basisWeight', label: 'Nominal weight'},
        ]);
        assert.deepEqual(
            columns.map((column) => column.heading),
            ['Caliper', 'Nominal weight', 'Commonly used for'],
        );
    });

    it('keeps both Thickness labels as separate columns', () => {
        const columns = specTableColumns([
            {key: 'fluteHeight', label: 'Thickness'},
            {key: 'thickness', label: 'Thickness'},
        ]);
        assert.deepEqual(
            columns.map((column) => column.key),
            ['thickness', 'fluteHeight'],
        );
        assert.deepEqual(
            columns.map((column) => column.heading),
            ['Thickness (mm)', 'Thickness (in)'],
        );
    });
});
