import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {mapDetailToPropertyFields} from './map-detail-to-property-fields';
import type {
    CustomizationDetail,
    CustomizationPropertyValue,
} from './types';

function prop(
    partial: Pick<
        CustomizationPropertyValue,
        'id' | 'title' | 'slug' | 'propertySlug' | 'propertyTitle'
    >,
): CustomizationPropertyValue {
    return {
        ...partial,
        facts: [],
    };
}

function detail(
    overrides: Partial<CustomizationDetail> &
        Pick<CustomizationDetail, 'title' | 'properties'>,
): CustomizationDetail {
    return {
        id: 'opt-1',
        slug: 'hot-foil-stamping',
        categoryValue: 'finishing',
        categoryLabel: 'Finishing',
        media: [],
        showcaseSolutions: [],
        showcaseCaseStudies: [],
        declaredProperties: [],
        productLines: [],
        ...overrides,
    };
}

describe('mapDetailToPropertyFields', () => {
    it('omits a sole property value that only echoes the option title', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Hot Foil Stamping',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'Hot Foil Stamping',
                        slug: 'hot-foil-stamping',
                        propertySlug: 'foiling',
                        propertyTitle: 'Foiling',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'foiling',
                        propertyTitle: 'Foiling',
                        valuesPerItem: 'one',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 0);
    });

    it('keeps multi-value properties even when one title matches the option', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Hot Foil Stamping',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'Hot Foil Stamping',
                        slug: 'hot-foil-stamping',
                        propertySlug: 'foiling',
                        propertyTitle: 'Foiling',
                    }),
                    prop({
                        id: 'pv-2',
                        title: 'Cold Foil',
                        slug: 'cold-foil',
                        propertySlug: 'foiling',
                        propertyTitle: 'Foiling',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'foiling',
                        propertyTitle: 'Foiling',
                        valuesPerItem: 'one',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 1);
        assert.equal(fields[0]?.options.length, 2);
    });

    it('keeps a sole value whose title differs from the option', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Soft Touch Lamination',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'Matte',
                        slug: 'matte',
                        propertySlug: 'finish',
                        propertyTitle: 'Finish',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'finish',
                        propertyTitle: 'Finish',
                        valuesPerItem: 'one',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 1);
        assert.equal(fields[0]?.options[0]?.title, 'Matte');
    });
});
