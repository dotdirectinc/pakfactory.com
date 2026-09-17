import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    expandDerivedOffer,
    filterOfferBySelections,
    resolveOffer,
    type OfferOption,
} from './customization-availability';
import type {CustomizationOption} from './types';

function option(
    partial: Partial<CustomizationOption> &
        Pick<CustomizationOption, 'id' | 'label' | 'category'>,
): CustomizationOption {
    return {
        typeId: `${partial.id}-type`,
        customerSelects: 'one',
        cardinality: 'one',
        configuratorRole: 'configurable',
        ...partial,
    };
}

function offer(partial: Partial<OfferOption> & Pick<OfferOption, 'optionId' | 'label' | 'categorySlug'>): OfferOption {
    return {
        typeId: `${partial.optionId}-type`,
        configuratorRole: 'configurable',
        customerSelects: 'one',
        worksOnIds: [],
        incompatibleIds: [],
        ...partial,
    };
}

describe('resolveOffer', () => {
    it('drops reference options and keeps configurable rows', () => {
        const rows = [
            option({
                id: 'mat-1',
                label: 'SBS',
                category: 'materials',
            }),
            option({
                id: 'ref-1',
                label: 'VMPET',
                category: 'materials',
                configuratorRole: 'reference',
                role: 'reference',
            }),
        ];
        const resolved = resolveOffer(rows);
        assert.equal(resolved.length, 1);
        assert.equal(resolved[0]?.optionId, 'mat-1');
    });
});

describe('expandDerivedOffer', () => {
    it('adds finishing that works on product materials', () => {
        const base = [
            offer({
                optionId: 'mat-paper',
                label: 'Paperboard',
                categorySlug: 'materials',
                typeId: 'type-paper',
            }),
            offer({
                optionId: 'add-1',
                label: 'Window',
                categorySlug: 'additional-customization',
            }),
        ];
        const universe = [
            offer({
                optionId: 'fin-soft',
                label: 'Soft Touch',
                categorySlug: 'finishing',
                worksOnIds: ['mat-paper'],
            }),
            offer({
                optionId: 'fin-blister',
                label: 'Blister only finish',
                categorySlug: 'finishing',
                worksOnIds: ['mat-plastic'],
            }),
            offer({
                optionId: 'print-1',
                label: 'CMYK',
                categorySlug: 'printing',
                worksOnIds: [],
            }),
        ];
        const expanded = expandDerivedOffer(base, universe);
        const ids = expanded.map((item) => item.optionId).sort();
        assert.deepEqual(ids, ['add-1', 'fin-soft', 'mat-paper', 'print-1']);
    });

    it('keeps empty worksOn as unrestricted for derived options', () => {
        const base = [
            offer({
                optionId: 'mat-paper',
                label: 'Paperboard',
                categorySlug: 'materials',
            }),
        ];
        const universe = [
            offer({
                optionId: 'print-open',
                label: 'Open print',
                categorySlug: 'printing',
                worksOnIds: [],
            }),
        ];
        const expanded = expandDerivedOffer(base, universe);
        assert.ok(expanded.some((item) => item.optionId === 'print-open'));
    });
});

describe('filterOfferBySelections', () => {
    it('narrows finishing when a material is selected and clears invalid answers', () => {
        const offerRows = [
            offer({
                optionId: 'mat-paper',
                label: 'Paperboard',
                categorySlug: 'materials',
                typeId: 'type-paper',
            }),
            offer({
                optionId: 'mat-plastic',
                label: 'Plastic',
                categorySlug: 'materials',
                typeId: 'type-plastic',
            }),
            offer({
                optionId: 'fin-soft',
                label: 'Soft Touch',
                categorySlug: 'finishing',
                worksOnIds: ['mat-paper', 'type-paper'],
            }),
            offer({
                optionId: 'fin-uv',
                label: 'UV',
                categorySlug: 'finishing',
                worksOnIds: ['mat-plastic', 'type-plastic'],
            }),
        ];

        const {offer: filtered, invalidAnswerKeys} = filterOfferBySelections(
            offerRows,
            {
                materials: {optionId: 'mat-paper', typeId: 'type-paper'},
                finishing: {optionId: 'fin-uv', typeId: 'fin-uv-type'},
            },
        );

        const finishIds = filtered
            .filter((item) => item.categorySlug === 'finishing')
            .map((item) => item.optionId);
        assert.deepEqual(finishIds, ['fin-soft']);
        assert.deepEqual(invalidAnswerKeys, ['finishing']);
    });

    it('excludes options that clash via incompatibleWith', () => {
        const offerRows = [
            offer({
                optionId: 'mat-paper',
                label: 'Paperboard',
                categorySlug: 'materials',
            }),
            offer({
                optionId: 'fin-a',
                label: 'Finish A',
                categorySlug: 'finishing',
                worksOnIds: [],
                incompatibleIds: ['mat-paper'],
            }),
            offer({
                optionId: 'fin-b',
                label: 'Finish B',
                categorySlug: 'finishing',
                worksOnIds: [],
            }),
        ];

        const {offer: filtered} = filterOfferBySelections(offerRows, {
            materials: {optionId: 'mat-paper'},
        });

        const finishIds = filtered
            .filter((item) => item.categorySlug === 'finishing')
            .map((item) => item.optionId);
        assert.deepEqual(finishIds, ['fin-b']);
    });
});
