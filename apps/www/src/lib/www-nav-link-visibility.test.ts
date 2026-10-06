import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    isWwwNavInternalLinkVisible,
    isWwwNavLinkVisible,
} from './www-nav-link-visibility';

describe('isWwwNavInternalLinkVisible', () => {
    it('keeps product lines that are active or unset and customer-facing', () => {
        for (const status of [undefined, null, 'active', '']) {
            assert.equal(
                isWwwNavInternalLinkVisible({
                    _type: 'productLine',
                    status: status as string | null | undefined,
                }),
                true,
                `status=${String(status)}`,
            );
        }
    });

    it('hides coming-soon, discontinued, or non-customer-facing lines and styles', () => {
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'productLine',
                status: 'coming-soon',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'productStyle',
                status: 'coming-soon',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'productLine',
                status: 'discontinued',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'productStyle',
                status: 'active-internal',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'productStyle',
                status: 'discontinued',
            }),
            false,
        );
    });

    it('lists coming-soon products in nav; hides discontinued products', () => {
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'product',
                status: 'discontinued',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'product',
                status: 'coming-soon',
            }),
            true,
        );
    });

    it('requires page-bearing appearsIn for customization options', () => {
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'customizationOption',
                appearsIn: 'configurable-with-page',
                status: 'active',
            }),
            true,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'customizationOption',
                appearsIn: 'not-configurable-with-page',
                status: 'active',
            }),
            true,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'customizationOption',
                appearsIn: 'configurable-no-page',
                status: 'active',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'customizationOption',
                status: 'active',
            }),
            false,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'customizationOption',
                appearsIn: 'configurable-with-page',
                status: 'not-active',
            }),
            false,
        );
    });

    it('passes through other document types', () => {
        assert.equal(
            isWwwNavInternalLinkVisible({_type: 'blogPost'}),
            true,
        );
        assert.equal(isWwwNavInternalLinkVisible(null), true);
    });

    it('gates solutions by status and expertise stages by listed status', () => {
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'solution',
                status: 'active',
            }),
            true,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'solution',
                status: 'not-active',
            }),
            false,
        );
        // No unset arm — `status` replaced `hasPage`, which defaulted to false.
        assert.equal(isWwwNavInternalLinkVisible({_type: 'solution'}), false);
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'expertiseStage',
                status: 'coming-soon',
            }),
            true,
        );
        assert.equal(
            isWwwNavInternalLinkVisible({
                _type: 'expertiseStage',
                status: 'discontinued',
            }),
            false,
        );
    });
});

describe('isWwwNavLinkVisible', () => {
    it('passes through listing paths with no pathTarget', () => {
        assert.equal(
            isWwwNavLinkVisible({
                linkType: 'path',
                relativePath: '/products',
                label: 'Products',
            }),
            true,
        );
        assert.equal(isWwwNavLinkVisible(null), false);
    });

    it('gates internal links by catalog status', () => {
        assert.equal(
            isWwwNavLinkVisible({
                linkType: 'internal',
                label: 'Gone',
                internalLink: {
                    _type: 'productLine',
                    status: 'discontinued',
                },
            }),
            false,
        );
    });

    it('hides path links whose pathTarget line is coming-soon', () => {
        assert.equal(
            isWwwNavLinkVisible({
                linkType: 'path',
                relativePath: '/products/test-folding-carton',
                label: '[Test] Folding Carton',
                pathTarget: {
                    _type: 'productLine',
                    status: 'coming-soon',
                },
            }),
            false,
        );
    });

    it('keeps path links whose pathTarget line is active', () => {
        assert.equal(
            isWwwNavLinkVisible({
                linkType: 'path',
                relativePath: '/products/test-rigid-boxes',
                label: '[Test] Rigid Boxes',
                pathTarget: {
                    _type: 'productLine',
                    status: 'active',
                },
            }),
            true,
        );
    });

    it('lists coming-soon products resolved from path', () => {
        assert.equal(
            isWwwNavLinkVisible({
                linkType: 'path',
                relativePath: '/products/some-sku',
                label: 'Coming product',
                pathTarget: {
                    _type: 'product',
                    status: 'coming-soon',
                },
            }),
            true,
        );
    });
});
