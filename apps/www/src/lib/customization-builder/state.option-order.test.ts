import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildStepsFromCatalog} from './state';
import type {CatalogOptionLike} from './types';

/**
 * PROD-2775 — `buildStepsFromCatalog` must apply `typeOptionOrder` via
 * `orderOptionsInType`. Mirrors packages/sanity option-order.test.ts and
 * state.type-order.test.ts.
 */

function option(partial: {
    id: string;
    label: string;
    typeOptionOrder?: string[];
}): CatalogOptionLike {
    return {
        id: partial.id,
        label: partial.label,
        category: 'materials',
        categoryTitle: 'Materials',
        typeId: 't.chipboard',
        typeSlug: 'chipboard',
        typeTitle: 'Chipboard',
        customerSelects: 'one',
        ...(partial.typeOptionOrder
            ? {typeOptionOrder: partial.typeOptionOrder}
            : {}),
    };
}

/** Deliberately NOT alphabetical insertion — White first, then Kraft, then Grey. */
function chipboardOptions(optionOrder?: string[]): CatalogOptionLike[] {
    const order =
        optionOrder && optionOrder.length > 0
            ? {typeOptionOrder: optionOrder}
            : {};
    return [
        option({id: 'o.white', label: 'White Chipboard', ...order}),
        option({id: 'o.kraft', label: 'Kraft Chipboard', ...order}),
        option({id: 'o.grey', label: 'Grey Chipboard', ...order}),
    ];
}

function optionLabels(available: CatalogOptionLike[]): string[] {
    const step = buildStepsFromCatalog(available).find(
        (s) => s.key === 'materials',
    );
    assert.ok(step, 'expected a materials selection step');
    return step.options.map((o) => o.title);
}

test('no typeOptionOrder: options are alphabetical by title', () => {
    assert.deepEqual(optionLabels(chipboardOptions()), [
        'Grey Chipboard',
        'Kraft Chipboard',
        'White Chipboard',
    ]);
    assert.deepEqual(optionLabels(chipboardOptions([])), [
        'Grey Chipboard',
        'Kraft Chipboard',
        'White Chipboard',
    ]);
});

test('partial typeOptionOrder: listed options lead in drag order; rest alphabetical', () => {
    assert.deepEqual(optionLabels(chipboardOptions(['o.white'])), [
        'White Chipboard',
        'Grey Chipboard',
        'Kraft Chipboard',
    ]);
});

test('full typeOptionOrder: exactly the drag order', () => {
    assert.deepEqual(
        optionLabels(chipboardOptions(['o.white', 'o.kraft', 'o.grey'])),
        ['White Chipboard', 'Kraft Chipboard', 'Grey Chipboard'],
    );
});

test('dangling optionOrder id is dropped; every option still appears', () => {
    assert.deepEqual(
        optionLabels(chipboardOptions(['o.white', 'DELETED', 'o.kraft'])),
        ['White Chipboard', 'Kraft Chipboard', 'Grey Chipboard'],
    );
});

test('optionOrder naming only deleted ids still returns the full alphabetical list', () => {
    assert.deepEqual(optionLabels(chipboardOptions(['GONE'])), [
        'Grey Chipboard',
        'Kraft Chipboard',
        'White Chipboard',
    ]);
});
