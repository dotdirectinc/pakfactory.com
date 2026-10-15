import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {PageSectionPressReleasesRowDoc} from '@pakfactory/sanity/queries';

import {
    PRESS_RELEASES_ROW_DEFAULT_CTA,
    mapPressReleasesRow,
} from './map-press-releases-row';

const row = (
    overrides: Partial<PageSectionPressReleasesRowDoc> = {},
): PageSectionPressReleasesRowDoc => ({
    _type: 'pressReleasesRow',
    _key: 'row',
    count: 3,
    items: [],
    ...overrides,
});

describe('mapPressReleasesRow — "See all" link (PROD-2918)', () => {
    it('shows the link when more releases exist than the row lists', () => {
        const mapped = mapPressReleasesRow(row({hasMore: true}));
        assert.equal(mapped.cta?.label, PRESS_RELEASES_ROW_DEFAULT_CTA);
        assert.equal(mapped.cta?.href, '/newsroom');
    });

    it('hides the link when the row already lists everything', () => {
        assert.equal(mapPressReleasesRow(row({hasMore: false})).cta, undefined);
    });

    it('hides the link when the host never filled the row', () => {
        assert.equal(mapPressReleasesRow(row()).cta, undefined);
    });
});
