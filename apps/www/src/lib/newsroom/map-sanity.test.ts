import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {PressReleaseCardDoc} from '@pakfactory/sanity/queries';

import {mapNewsCard, mapNewsCards, mapNewsItem} from './map-sanity';

const card = (over: Partial<PressReleaseCardDoc> = {}): PressReleaseCardDoc => ({
    _id: 'pr-1',
    title: 'PakFactory opens a new facility',
    slug: 'new-facility',
    summary: 'One sentence.',
    category: 'facility',
    publishedAt: '2026-09-15T14:00:00Z',
    ...over,
});

describe('mapNewsCard (PROD-2913)', () => {
    it('maps href, label, Toronto date and year', () => {
        const mapped = mapNewsCard(card());
        assert.ok(mapped);
        assert.equal(mapped.href, '/newsroom/new-facility');
        assert.equal(mapped.categoryLabel, 'Facility & network');
        assert.equal(mapped.dateLabel, 'September 15, 2026');
        assert.equal(mapped.year, '2026');
    });

    it('files a late-evening Dec 31 release under its Toronto year', () => {
        // 02:00 UTC on Jan 1 is 9 pm on Dec 31 in Markham.
        const mapped = mapNewsCard(card({publishedAt: '2027-01-01T02:00:00Z'}));
        assert.equal(mapped?.year, '2026');
        assert.equal(mapped?.dateLabel, 'December 31, 2026');
    });

    it('drops a release missing title, slug or publish date', () => {
        assert.equal(mapNewsCard(card({title: '  '})), null);
        assert.equal(mapNewsCard(card({slug: null})), null);
        assert.equal(mapNewsCard(card({publishedAt: 'not a date'})), null);
        assert.equal(mapNewsCards([card(), card({_id: 'x', slug: ''})]).length, 1);
    });

    it('ignores an unknown category instead of labelling it', () => {
        const mapped = mapNewsCard(card({category: 'rumour'}));
        assert.equal(mapped?.category, null);
        assert.equal(mapped?.categoryLabel, null);
    });

    it('keeps the hotspot as object-position and falls back to the title for alt', () => {
        const mapped = mapNewsCard(
            card({
                image: {
                    url: 'https://cdn.sanity.io/images/p/d/abc-1600x900.jpg',
                    hotspot: {x: 0.25, y: 0.6},
                },
            }),
        );
        assert.equal(mapped?.image?.objectPosition, '25% 60%');
        assert.equal(mapped?.image?.alt, 'PakFactory opens a new facility');
    });

    it('uses the YouTube thumbnail for a video release with no override', () => {
        const mapped = mapNewsCard(
            card({videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', image: {url: null}}),
        );
        assert.equal(
            mapped?.image?.src,
            'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        );
    });
});

describe('mapNewsItem (PROD-2918)', () => {
    it('defaults the dateline and reads SEO flags as opt-out', () => {
        const item = mapNewsItem({
            ...card(),
            dateline: null,
            body: [],
            allowIndex: null,
            allowFollow: false,
            layout: {_id: 'newsroomDetailPage', sections: []},
        });
        assert.ok(item);
        assert.equal(item.dateline, 'Markham, ON');
        assert.equal(item.seo.allowIndex, true);
        assert.equal(item.seo.allowFollow, false);
        assert.equal(item.lastModifiedLabel, null);
    });

    it('maps a video hero to a link-out with a thumbnail', () => {
        const item = mapNewsItem({
            ...card(),
            heroMedia: {
                mediaType: 'video',
                videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
            },
        });
        assert.deepEqual(item?.hero, {
            kind: 'video',
            videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
            thumbnailSrc: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        });
    });
});
