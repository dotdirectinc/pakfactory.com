import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
    isBuilderConfigured,
    seedFromCustomizations,
} from './state';
import type {CatalogOptionLike} from './types';

/**
 * PROD-2773 — inspiration presets must seed the request rail as configured.
 */

function option(partial: {
    id: string;
    label: string;
    category: string;
    typeId: string;
    preselected?: boolean;
}): CatalogOptionLike {
    return {
        id: partial.id,
        label: partial.label,
        category: partial.category,
        categoryTitle: partial.category,
        typeId: partial.typeId,
        typeTitle: partial.typeId,
        customerSelects: 'one',
        ...(partial.preselected ? {preselected: true} : {}),
    };
}

test('seedFromCustomizations with explicit preselected flags seeds only those options', () => {
    const state = seedFromCustomizations([
        option({
            id: 'o.mirror',
            label: 'Mirror',
            category: 'finish',
            typeId: 't.finish',
            preselected: true,
        }),
        option({
            id: 'o.chipboard',
            label: 'Standard Chipboard',
            category: 'materials',
            typeId: 't.chipboard',
            preselected: true,
        }),
        option({
            id: 'o.other',
            label: 'Other',
            category: 'materials',
            typeId: 't.chipboard',
        }),
    ]);

    assert.equal(isBuilderConfigured(state), true);
    assert.equal(state.guidedComplete, true);
    assert.ok(state.answers.finish);
    assert.ok(state.answers.materials);
    assert.equal(
        state.answers.finish?.status === 'set' &&
            'selections' in state.answers.finish
            ? state.answers.finish.selections[0]?.optionId
            : null,
        'o.mirror',
    );
    assert.equal(
        state.answers.materials?.status === 'set' &&
            'selections' in state.answers.materials
            ? state.answers.materials.selections[0]?.optionId
            : null,
        'o.chipboard',
    );
});

test('seedFromCustomizations with an empty list stays unconfigured', () => {
    const state = seedFromCustomizations([]);
    assert.equal(isBuilderConfigured(state), false);
    assert.equal(state.guidedComplete, false);
});
