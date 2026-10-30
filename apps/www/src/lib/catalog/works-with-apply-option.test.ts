import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    isAchievesApplyPending,
    resolveWorksWithApplyOption,
} from './works-with-apply-option';

const page = {category: 'finishing', slug: 'aq-coating'};
const achieves = [
    {
        id: 'opt-gloss',
        title: 'Gloss',
        slug: 'gloss',
        categorySlug: 'finishing',
    },
];

describe('resolveWorksWithApplyOption', () => {
    it('returns the page option when CTA is on and source is properties', () => {
        assert.deepEqual(
            resolveWorksWithApplyOption({
                showCta: true,
                configurationSource: 'properties',
                pageOption: page,
                achieves,
                selectedAchievesId: 'opt-gloss',
            }),
            page,
        );
    });

    it('returns null when CTA is off so product links do not preselect', () => {
        assert.equal(
            resolveWorksWithApplyOption({
                showCta: false,
                configurationSource: 'properties',
                pageOption: page,
                achieves,
                selectedAchievesId: null,
            }),
            null,
        );
    });

    it('uses the page option when Configuration is No Configuration (none)', () => {
        assert.deepEqual(
            resolveWorksWithApplyOption({
                showCta: true,
                configurationSource: 'none',
                pageOption: page,
                achieves,
                selectedAchievesId: 'opt-gloss',
            }),
            page,
        );
    });

    it('uses the selected Achieves target and the page option as achievedBy', () => {
        assert.deepEqual(
            resolveWorksWithApplyOption({
                showCta: true,
                configurationSource: 'achieves',
                pageOption: page,
                achieves,
                selectedAchievesId: 'opt-gloss',
            }),
            {
                category: 'finishing',
                slug: 'gloss',
                achievedBySlug: 'aq-coating',
            },
        );
    });

    it('returns null until an Achieves target is selected', () => {
        assert.equal(
            resolveWorksWithApplyOption({
                showCta: true,
                configurationSource: 'achieves',
                pageOption: page,
                achieves,
                selectedAchievesId: null,
            }),
            null,
        );
        assert.equal(
            isAchievesApplyPending({
                showCta: true,
                configurationSource: 'achieves',
                applyOption: null,
            }),
            true,
        );
    });
});
