import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildStepsFromCatalog} from './state';
import type {CatalogOptionLike} from './types';

/**
 * PROD-2746 — `buildStepsFromCatalog` must apply `categoryTypeOrder` via
 * `orderTypesInCategory`. Mirrors packages/sanity customization-type-order.test.ts.
 */

function option(partial: {
    id: string;
    typeId: string;
    typeTitle: string;
    categoryTypeOrder?: string[];
}): CatalogOptionLike {
    return {
        id: partial.id,
        label: partial.id,
        category: 'materials',
        categoryTitle: 'Materials',
        typeId: partial.typeId,
        typeSlug: partial.typeId,
        typeTitle: partial.typeTitle,
        customerSelects: 'one',
        ...(partial.categoryTypeOrder
            ? {categoryTypeOrder: partial.categoryTypeOrder}
            : {}),
    };
}

/** Deliberately NOT alphabetical insertion — Paperboard first, then Kraft, then Corrugated. */
function materialsOptions(typeOrder?: string[]): CatalogOptionLike[] {
    const order =
        typeOrder && typeOrder.length > 0
            ? {categoryTypeOrder: typeOrder}
            : {};
    return [
        option({
            id: 'o.paperboard',
            typeId: 't.paperboard',
            typeTitle: 'Paperboard',
            ...order,
        }),
        option({
            id: 'o.kraft',
            typeId: 't.kraft',
            typeTitle: 'Kraft Paper',
            ...order,
        }),
        option({
            id: 'o.corrugated',
            typeId: 't.corrugated',
            typeTitle: 'Corrugated',
            ...order,
        }),
    ];
}

function typeTitles(available: CatalogOptionLike[]): string[] {
    const step = buildStepsFromCatalog(available).find(
        (s) => s.key === 'materials',
    );
    assert.ok(step, 'expected a materials selection step');
    return step.types.map((t) => t.title);
}

test('no categoryTypeOrder: types are alphabetical by title', () => {
    assert.deepEqual(typeTitles(materialsOptions()), [
        'Corrugated',
        'Kraft Paper',
        'Paperboard',
    ]);
    assert.deepEqual(typeTitles(materialsOptions([])), [
        'Corrugated',
        'Kraft Paper',
        'Paperboard',
    ]);
});

test('partial categoryTypeOrder: listed types lead in drag order; rest alphabetical', () => {
    assert.deepEqual(typeTitles(materialsOptions(['t.paperboard'])), [
        'Paperboard',
        'Corrugated',
        'Kraft Paper',
    ]);
});

test('full categoryTypeOrder: exactly the drag order', () => {
    assert.deepEqual(
        typeTitles(
            materialsOptions(['t.paperboard', 't.corrugated', 't.kraft']),
        ),
        ['Paperboard', 'Corrugated', 'Kraft Paper'],
    );
});

test('dangling typeOrder id is dropped; every type with options still appears', () => {
    assert.deepEqual(
        typeTitles(
            materialsOptions(['t.paperboard', 'DELETED', 't.corrugated']),
        ),
        ['Paperboard', 'Corrugated', 'Kraft Paper'],
    );
});

test('typeOrder naming only deleted ids still returns the full alphabetical list', () => {
    assert.deepEqual(typeTitles(materialsOptions(['GONE'])), [
        'Corrugated',
        'Kraft Paper',
        'Paperboard',
    ]);
});
