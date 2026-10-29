import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {CatalogOptionDoc} from '@pakfactory/sanity/queries';
import {mapSanityOptionDoc} from '@/lib/catalog/map-sanity';
import {buildStepsFromCatalog} from './state';
import {optionCardBlurb} from './option-card-blurb';
import type {CatalogOptionLike} from './types';

/**
 * PROD-3211 — highlights reaches the configurator list card and stays
 * separate from the detail-pane shortDescription.
 */

function optionDoc(
    partial: Partial<CatalogOptionDoc> & Pick<CatalogOptionDoc, '_id' | 'title'>,
): CatalogOptionDoc {
    return {
        slug: partial._id,
        status: 'active',
        appearsIn: 'configurable-with-page',
        type: {
            _id: 't.wrap',
            title: 'Paper Wrap',
            slug: 'paper-wrap',
            customerSelects: 'one',
            category: {
                _id: 'c.materials',
                title: 'Materials',
                slug: 'materials',
            },
        },
        ...partial,
    };
}

test('mapSanityOptionDoc keeps highlights separate from shortDescription', () => {
    const mapped = mapSanityOptionDoc(
        optionDoc({
            _id: 'o.kraft',
            title: 'Kraft',
            shortDescription:
                'Porous, matte paper wrap that softens ink saturation and takes foil stamping.',
            highlights: 'Takes foil cleanly · Hides fingerprints',
        }),
    );

    assert.ok(mapped);
    assert.equal(mapped.highlights, 'Takes foil cleanly · Hides fingerprints');
    assert.equal(
        mapped.shortDescription,
        'Porous, matte paper wrap that softens ink saturation and takes foil stamping.',
    );
    // Detail-pane description still prefers the short sentence, not highlights.
    assert.equal(
        mapped.description,
        'Porous, matte paper wrap that softens ink saturation and takes foil stamping.',
    );
});

test('mapSanityOptionDoc omits highlights when empty or whitespace', () => {
    const empty = mapSanityOptionDoc(
        optionDoc({
            _id: 'o.matte',
            title: 'Matte',
            shortDescription: 'Soft matte finish.',
            highlights: '   ',
        }),
    );
    assert.ok(empty);
    assert.equal(empty.highlights, undefined);
    assert.equal(empty.shortDescription, 'Soft matte finish.');
});

test('buildStepsFromCatalog copies highlights onto BuilderOption', () => {
    const available: CatalogOptionLike[] = [
        {
            id: 'o.kraft',
            label: 'Kraft',
            category: 'materials',
            categoryTitle: 'Materials',
            typeId: 't.wrap',
            typeTitle: 'Paper Wrap',
            customerSelects: 'one',
            shortDescription: 'Porous matte wrap.',
            highlights: 'Takes foil cleanly · Hides fingerprints',
        },
        {
            id: 'o.gloss',
            label: 'Gloss',
            category: 'materials',
            categoryTitle: 'Materials',
            typeId: 't.wrap',
            typeTitle: 'Paper Wrap',
            customerSelects: 'one',
            shortDescription: 'High-shine wrap.',
        },
    ];

    const step = buildStepsFromCatalog(available).find(
        (s) => s.key === 'materials',
    );
    assert.ok(step);

    const kraft = step.options.find((o) => o.id === 'o.kraft');
    const gloss = step.options.find((o) => o.id === 'o.gloss');
    assert.ok(kraft);
    assert.ok(gloss);
    assert.equal(kraft.highlights, 'Takes foil cleanly · Hides fingerprints');
    assert.equal(kraft.shortDescription, 'Porous matte wrap.');
    assert.equal(gloss.highlights, undefined);
    assert.equal(gloss.shortDescription, 'High-shine wrap.');
});

test('optionCardBlurb prefers highlights, then shortDescription, then blank', () => {
    assert.equal(
        optionCardBlurb({
            highlights: 'Takes foil cleanly · Hides fingerprints',
            shortDescription: 'Porous matte wrap.',
        }),
        'Takes foil cleanly · Hides fingerprints',
    );
    assert.equal(
        optionCardBlurb({
            highlights: '  ',
            shortDescription: 'Porous matte wrap.',
        }),
        'Porous matte wrap.',
    );
    assert.equal(
        optionCardBlurb({
            highlights: null,
            shortDescription: null,
        }),
        '',
    );
});
