import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {getLearnFirstSectionCopy, getReferenceCopy} from './reference-copy';

describe('getReferenceCopy', () => {
    it('builds materials compare label', () => {
        const copy = getReferenceCopy('materials', 'Materials');
        assert.equal(copy.compareLabel, 'Compare with other materials');
        assert.equal(copy.noun, 'material');
    });
});

describe('getLearnFirstSectionCopy (PROD-3112)', () => {
    it('builds compare / works-with / showcase labels from the option', () => {
        const copy = getLearnFirstSectionCopy({
            title: 'Color Chipboard (Pure Color Core)',
            categoryValue: 'materials',
            categoryLabel: 'Materials',
        });
        assert.equal(copy.compare.eyebrow, 'Same category · Materials');
        assert.equal(
            copy.compare.title,
            'Compare with other Materials options',
        );
        assert.equal(
            copy.compare.description,
            'How Color Chipboard (Pure Color Core) stacks up against the other materials in this category — so you can choose the right option, not just this one.',
        );
        assert.equal(copy.worksWith.eyebrow, 'Works on these product styles');
        assert.equal(
            copy.worksWith.title,
            'Apply it on different product styles',
        );
        assert.equal(
            copy.worksWith.description,
            'The styles this option works on. Apply carries your selection straight into the product.',
        );
        assert.equal(copy.showcase.eyebrow, 'Get inspired');
        assert.equal(copy.showcase.title, 'See it in action');
        assert.match(copy.showcase.description, /Color Chipboard/);
        assert.equal(copy.overview.eyebrow, 'Overview');
        assert.equal(
            copy.overview.title,
            'Get to know Color Chipboard (Pure Color Core)',
        );
        assert.equal(copy.overview.navLabel, 'Overview');
        assert.equal(copy.specsLabel, 'Key properties');
        assert.equal(copy.compatibleOptions.eyebrow, 'Compatible customizations');
        assert.equal(copy.compatibleOptions.title, 'What it works with');
        assert.equal(
            copy.compatibleOptions.description,
            'Other options specified together with Color Chipboard (Pure Color Core).',
        );
        assert.equal(copy.compatibleOptions.navLabel, 'Compatible options');
    });

    it('uses finishes peer noun for finishing compare description', () => {
        const copy = getLearnFirstSectionCopy({
            title: 'Soft-Touch Lamination',
            categoryValue: 'finishing',
            categoryLabel: 'Finishing',
        });
        assert.match(copy.compare.description, /other finishes in this category/);
    });

    it('falls back to options peer noun for other categories', () => {
        const copy = getLearnFirstSectionCopy({
            title: 'Offset Lithography',
            categoryValue: 'printing',
            categoryLabel: 'Printing',
        });
        assert.match(copy.compare.description, /other options in this category/);
    });

    it('pluralizes the option type for materials compare copy', () => {
        const copy = getLearnFirstSectionCopy({
            title: 'Acrylonitrile Butadiene Styrene (ABS)',
            categoryValue: 'materials',
            categoryLabel: 'Materials',
            typeTitle: 'Rigid Plastic',
        });
        assert.match(
            copy.compare.description,
            /other rigid plastics in this category/,
        );
    });
});
