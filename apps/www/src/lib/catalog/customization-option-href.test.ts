import assert from 'node:assert/strict';
import {test} from 'node:test';

import {customizationOptionHref} from './customization-option-href';

const base = {category: 'materials', slug: 'kraft', status: 'active'};

test('links options that have a detail page', () => {
    assert.equal(
        customizationOptionHref({...base, appearsIn: 'configurable-with-page'}),
        '/customizations/materials/kraft',
    );
    assert.equal(
        customizationOptionHref({...base, appearsIn: 'not-configurable-with-page'}),
        '/customizations/materials/kraft',
    );
});

test('no link for configurator-only options (the PROD-2758 404s)', () => {
    assert.equal(
        customizationOptionHref({...base, appearsIn: 'configurable-no-page'}),
        undefined,
    );
});

test('no link when appearsIn is unset (un-backfilled reads as no page)', () => {
    assert.equal(customizationOptionHref(base), undefined);
});

test('no link unless status is active, matching the detail query', () => {
    for (const status of ['coming-soon', 'discontinued', undefined]) {
        assert.equal(
            customizationOptionHref({
                ...base,
                status,
                appearsIn: 'configurable-with-page',
            }),
            undefined,
        );
    }
});

test('no link without category or slug', () => {
    const appearsIn = 'configurable-with-page';
    assert.equal(customizationOptionHref({...base, appearsIn, slug: ' '}), undefined);
    assert.equal(customizationOptionHref({...base, appearsIn, category: null}), undefined);
});
