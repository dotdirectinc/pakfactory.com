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
        | 'id'
        | 'title'
        | 'slug'
        | 'propertySlug'
        | 'propertyTitle'
        | 'imageUrl'
        | 'kindOfSlug'
        | 'kindOfTitle'
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

    it('uses an explicit declared control over image inference', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Board',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'White',
                        slug: 'white',
                        propertySlug: 'color',
                        propertyTitle: 'Color',
                        imageUrl: 'https://cdn.example/white.jpg',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'color',
                        propertyTitle: 'Color',
                        control: 'listbox',
                        valuesPerItem: 'many',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 1);
        assert.equal(fields[0]?.kind, 'listbox');
        assert.equal(fields[0]?.valuesPerItem, 'many');
    });

    it('infers flat swatch when control is unset and a value has a color', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Board',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'Black',
                        slug: 'black',
                        propertySlug: 'color',
                        propertyTitle: 'Color',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'color',
                        propertyTitle: 'Color',
                    },
                ],
            }),
        );
        assert.equal(fields[0]?.kind, 'swatch');
    });

    it('forces one pick for radio even when valuesPerItem is many', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Board',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: '12 pt',
                        slug: '12-pt',
                        propertySlug: 'thickness',
                        propertyTitle: 'Thickness',
                    }),
                    prop({
                        id: 'pv-2',
                        title: '16 pt',
                        slug: '16-pt',
                        propertySlug: 'thickness',
                        propertyTitle: 'Thickness',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'thickness',
                        propertyTitle: 'Thickness',
                        control: 'radio',
                        valuesPerItem: 'many',
                    },
                ],
            }),
        );
        assert.equal(fields[0]?.kind, 'radio');
        assert.equal(fields[0]?.valuesPerItem, 'one');
    });

    it('keeps kindOf on swatchShades options', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Foil',
                properties: [
                    prop({
                        id: 'pv-gold',
                        title: 'Gold',
                        slug: 'gold',
                        propertySlug: 'foil-colour',
                        propertyTitle: 'Foil Colour',
                    }),
                    prop({
                        id: 'pv-champ',
                        title: 'Champagne',
                        slug: 'champagne',
                        propertySlug: 'foil-colour',
                        propertyTitle: 'Foil Colour',
                        kindOfSlug: 'gold',
                        kindOfTitle: 'Gold',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'foil-colour',
                        propertyTitle: 'Foil Colour',
                        control: 'swatchShades',
                    },
                ],
            }),
        );
        assert.equal(fields[0]?.kind, 'swatchShades');
        assert.equal(fields[0]?.valuesPerItem, 'one');
        const champ = fields[0]?.options.find((o) => o.id === 'champagne');
        assert.equal(champ?.kindOfSlug, 'gold');
    });

    it('forces one pick for dimension even when valuesPerItem is many', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Board',
                properties: [],
                declaredProperties: [
                    {
                        usage: 'selectable',
                        propertySlug: 'size',
                        propertyTitle: 'Size',
                        control: 'dimension',
                        valuesPerItem: 'many',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 1);
        assert.equal(fields[0]?.kind, 'dimension');
        assert.equal(fields[0]?.valuesPerItem, 'one');
        assert.equal(fields[0]?.options.length, 0);
    });

    it('does not render a picker for stated properties', () => {
        const fields = mapDetailToPropertyFields(
            detail({
                title: 'Board',
                properties: [
                    prop({
                        id: 'pv-1',
                        title: 'Recyclable',
                        slug: 'recyclable',
                        propertySlug: 'sustainability',
                        propertyTitle: 'Sustainability',
                    }),
                ],
                declaredProperties: [
                    {
                        usage: 'stated',
                        propertySlug: 'sustainability',
                        propertyTitle: 'Sustainability',
                    },
                ],
            }),
        );
        assert.equal(fields.length, 0);
    });
});
