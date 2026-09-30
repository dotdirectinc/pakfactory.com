import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    FINDER_INDUSTRY_SENTINEL_SLUG,
    FINDER_LINE_SENTINEL_SLUG,
    allIndustriesOption,
    buildFinderSlides,
    finderFeatureKind,
    industryHasLineMatch,
    packagingSolutionLine,
    pickFinderStudy,
    rankIndustriesForLine,
    rankIndustriesWithAllFirst,
    withFinderSentinels,
} from './hero-finder-match';
import type {
    HeroFinderIndustry,
    HeroFinderLine,
    HeroFinderStudy,
} from './map-hero';

const study = (id: string, lineIds: string[] = []): HeroFinderStudy => ({
    id,
    title: id,
    href: `/case-studies/${id}`,
    image: {src: 'https://cdn.sanity.io/x.jpg', alt: id},
    lineIds,
});

const line = (id: string, studies: HeroFinderStudy[] = []): HeroFinderLine => ({
    id,
    slug: id,
    title: id,
    href: `/products/${id}`,
    studies,
});

const industry = (
    id: string,
    studies: HeroFinderStudy[] = [],
): HeroFinderIndustry => ({
    id,
    slug: id,
    title: id,
    href: `/solutions/${id}`,
    studies,
});

describe('pickFinderStudy (PROD-2666)', () => {
    it('prefers an industry study that covers the line', () => {
        const picked = pickFinderStudy(
            line('rigid'),
            industry('beauty', [study('a', ['mailer']), study('b', ['rigid'])]),
        );
        assert.equal(picked?.id, 'b');
    });

    it('falls back to the industry’s first related study', () => {
        const picked = pickFinderStudy(
            line('rigid', [study('line-1')]),
            industry('beauty', [study('a', ['mailer'])]),
        );
        assert.equal(picked?.id, 'a');
    });

    it('falls back to the line’s study when the industry has none', () => {
        const picked = pickFinderStudy(
            line('rigid', [study('line-1')]),
            industry('beauty'),
        );
        assert.equal(picked?.id, 'line-1');
    });

    it('returns null when neither side has a study', () => {
        assert.equal(pickFinderStudy(line('rigid'), industry('beauty')), null);
    });

    it('Packaging Solution × All uses the first curated line study', () => {
        const curated = [
            line('mailer'),
            line('rigid', [study('rigid-1')]),
            line('tube', [study('tube-1')]),
        ];
        const picked = pickFinderStudy(
            packagingSolutionLine(),
            allIndustriesOption(),
            curated,
        );
        assert.equal(picked?.id, 'rigid-1');
    });

    it('specific line × All uses that line’s study', () => {
        const picked = pickFinderStudy(
            line('rigid', [study('rigid-1')]),
            allIndustriesOption(),
            [line('mailer', [study('mailer-1')])],
        );
        assert.equal(picked?.id, 'rigid-1');
    });

    it('Packaging Solution × industry uses the industry’s first study', () => {
        const picked = pickFinderStudy(
            packagingSolutionLine(),
            industry('beauty', [study('a', ['mailer']), study('b', ['rigid'])]),
        );
        assert.equal(picked?.id, 'a');
    });
});

describe('withFinderSentinels (PROD-2666)', () => {
    it('prepends Packaging Solution and All', () => {
        const {lines, industries} = withFinderSentinels(
            [line('rigid')],
            [industry('beauty')],
        );
        assert.equal(lines[0]?.slug, FINDER_LINE_SENTINEL_SLUG);
        assert.equal(lines[1]?.slug, 'rigid');
        assert.equal(industries[0]?.slug, FINDER_INDUSTRY_SENTINEL_SLUG);
        assert.equal(industries[1]?.slug, 'beauty');
    });

    it('drops curated items that collide with sentinel slugs', () => {
        const {lines, industries} = withFinderSentinels(
            [line(FINDER_LINE_SENTINEL_SLUG), line('rigid')],
            [industry(FINDER_INDUSTRY_SENTINEL_SLUG), industry('beauty')],
        );
        assert.equal(lines.length, 2);
        assert.equal(lines[0]?.title, 'Packaging Solution');
        assert.equal(industries.length, 2);
        assert.equal(industries[0]?.title, 'All');
    });
});

describe('industryHasLineMatch / rankIndustriesForLine (PROD-2666)', () => {
    it('detects a true line match on an industry', () => {
        assert.equal(
            industryHasLineMatch(
                industry('beauty', [study('a', ['rigid'])]),
                'rigid',
            ),
            true,
        );
        assert.equal(
            industryHasLineMatch(
                industry('beauty', [study('a', ['mailer'])]),
                'rigid',
            ),
            false,
        );
    });

    it('never matches the All sentinel or Packaging Solution line id', () => {
        assert.equal(
            industryHasLineMatch(allIndustriesOption(), 'rigid'),
            false,
        );
        assert.equal(
            industryHasLineMatch(
                industry('beauty', [study('a', ['rigid'])]),
                packagingSolutionLine().id,
            ),
            false,
        );
    });

    it('ranks industries with a line match first and keeps relative order', () => {
        const ranked = rankIndustriesForLine(
            [
                industry('apparel', [study('a', ['mailer'])]),
                industry('beauty', [study('b', ['rigid'])]),
                industry('food', [study('c', ['mailer'])]),
                industry('tech', [study('d', ['rigid']), study('e', ['tube'])]),
            ],
            'rigid',
        );
        assert.deepEqual(
            ranked.map((item) => item.id),
            ['beauty', 'tech', 'apparel', 'food'],
        );
    });

    it('keeps All first when ranking with the sentinel present', () => {
        const ranked = rankIndustriesWithAllFirst(
            [
                allIndustriesOption(),
                industry('apparel', [study('a', ['mailer'])]),
                industry('beauty', [study('b', ['rigid'])]),
            ],
            'rigid',
        );
        assert.deepEqual(
            ranked.map((item) => item.slug),
            [FINDER_INDUSTRY_SENTINEL_SLUG, 'beauty', 'apparel'],
        );
    });
});

describe('finderFeatureKind (PROD-2666)', () => {
    it('labels a line-matched industry study as caseStudy', () => {
        const rigid = line('rigid');
        const beauty = industry('beauty', [
            study('a', ['mailer']),
            study('b', ['rigid']),
        ]);
        const picked = pickFinderStudy(rigid, beauty);
        assert.equal(finderFeatureKind(rigid, beauty, picked), 'caseStudy');
    });

    it('labels an industry-only or line-only study as related', () => {
        const rigid = line('rigid', [study('line-1')]);
        const beauty = industry('beauty', [study('a', ['mailer'])]);
        assert.equal(
            finderFeatureKind(rigid, beauty, pickFinderStudy(rigid, beauty)),
            'related',
        );

        const emptyIndustry = industry('food');
        assert.equal(
            finderFeatureKind(
                rigid,
                emptyIndustry,
                pickFinderStudy(rigid, emptyIndustry),
            ),
            'related',
        );
    });

    it('labels a missing study as industry', () => {
        assert.equal(
            finderFeatureKind(line('rigid'), industry('beauty'), null),
            'industry',
        );
    });

    it('labels sentinel-derived studies as related', () => {
        const rigid = line('rigid', [study('rigid-1')]);
        const picked = pickFinderStudy(rigid, allIndustriesOption());
        assert.equal(
            finderFeatureKind(rigid, allIndustriesOption(), picked),
            'related',
        );
    });
});

describe('buildFinderSlides (PROD-2666)', () => {
    it('builds a scrollable rail for Packaging Solution × All', () => {
        const curatedLines = [
            line('mailer', [study('m1')]),
            line('rigid', [study('r1')]),
            line('tube', [study('t1')]),
        ];
        const curatedIndustries = [industry('beauty'), industry('apparel')];
        const slides = buildFinderSlides({
            line: packagingSolutionLine(),
            industry: allIndustriesOption(),
            curatedLines,
            curatedIndustries,
        });
        assert.ok(slides.length >= 4);
        assert.equal(slides[0]?.id, `line-${packagingSolutionLine().id}`);
        assert.ok(slides.some((slide) => slide.id === 'study-m1'));
        assert.ok(slides.some((slide) => slide.id.startsWith('industry-')));
    });

    it('dedupes and caps the rail', () => {
        const manyLines = Array.from({length: 12}, (_, i) =>
            line(`line-${i}`, [study(`s-${i}`)]),
        );
        const slides = buildFinderSlides({
            line: packagingSolutionLine(),
            industry: allIndustriesOption(),
            curatedLines: manyLines,
            curatedIndustries: [],
        });
        assert.ok(slides.length <= 8);
        assert.equal(new Set(slides.map((s) => s.id)).size, slides.length);
    });
});
