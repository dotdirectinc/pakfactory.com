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
    HeroFinderGeneralEntry,
    HeroFinderGeneralRail,
    HeroFinderIndustry,
    HeroFinderLine,
    HeroFinderStudy,
} from './map-hero';

const study = (
    id: string,
    lineIds: string[] = [],
    extras: Partial<HeroFinderStudy> = {},
): HeroFinderStudy => ({
    id,
    title: id,
    href: `/case-studies/${id}`,
    image: {src: 'https://cdn.sanity.io/x.jpg', alt: id},
    lineIds,
    ...extras,
});

const line = (
    id: string,
    studies: HeroFinderStudy[] = [],
    extras: Partial<HeroFinderLine> = {},
): HeroFinderLine => ({
    id,
    slug: id,
    title: id,
    href: `/products/${id}`,
    studies,
    ...extras,
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

const generalEntry = (
    id: string,
    kindLabel: string,
    extras: Partial<HeroFinderGeneralEntry> = {},
): HeroFinderGeneralEntry => ({
    id,
    kindLabel,
    title: id,
    imageFit: 'cover',
    link: {label: 'Learn more', href: `/${id}`},
    ...extras,
});

const generalRail = (
    extras: Partial<HeroFinderGeneralRail> = {},
): HeroFinderGeneralRail => ({
    railOrder: 'business',
    products: [],
    industries: [],
    customizations: [],
    expertise: [],
    caseStudies: [],
    ...extras,
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
    it('uses Studio General buckets for Packaging Solution × All', () => {
        const rail = generalRail({
            products: [generalEntry('mailer', 'Product', {imageFit: 'contain'})],
            industries: [generalEntry('beauty', 'Industry')],
            expertise: [generalEntry('design', 'Expertise')],
            caseStudies: [generalEntry('cs1', 'Case study')],
        });
        const slides = buildFinderSlides({
            line: packagingSolutionLine(),
            industry: allIndustriesOption(),
            curatedLines: [line('mailer', [study('m1')])],
            curatedIndustries: [industry('beauty')],
            generalRail: rail,
        });
        assert.equal(slides[0]?.id, 'general-product-mailer');
        assert.ok(slides.some((slide) => slide.id === 'general-industry-beauty'));
        assert.ok(slides.some((slide) => slide.id === 'general-expertise-design'));
        assert.ok(slides.some((slide) => slide.id === 'general-case-study-cs1'));
        assert.ok(!slides.some((slide) => slide.id === 'study-m1'));
    });

    it('Specific line shows up to 3 styles then relative case studies', () => {
        const styles = [
            {id: 's1', title: 'S1', slug: 's1'},
            {id: 's2', title: 'S2', slug: 's2'},
            {id: 's3', title: 'S3', slug: 's3'},
            {id: 's4', title: 'S4', slug: 's4'},
        ];
        const slides = buildFinderSlides({
            line: line('mailer', [study('m1'), study('m2')], {styles}),
            industry: allIndustriesOption(),
            curatedLines: [line('mailer', [study('m1'), study('m2')], {styles})],
            curatedIndustries: [industry('beauty', [study('b1', ['mailer'])])],
            generalRail: generalRail({
                expertise: [generalEntry('design', 'Expertise')],
                industries: [generalEntry('beauty', 'Industry')],
            }),
        });
        const styleSlides = slides.filter((slide) => slide.id.startsWith('style-'));
        assert.equal(styleSlides.length, 3);
        assert.ok(slides.some((slide) => slide.id === 'general-expertise-design'));
        assert.ok(slides.some((slide) => slide.id === 'study-m1'));
        assert.ok(slides.some((slide) => slide.id === 'industry-beauty'));
    });

    it('uses case study summary as excerpt and omits stat', () => {
        const featured = study('hello-adorn', ['mailer'], {
            title: 'From Mailer to Reveal',
            summary: 'Two-format unboxing for Hello Adorn.',
            clientName: 'Hello Adorn',
            stat: {value: '40%', label: 'Fewer damage claims'},
        });
        const slides = buildFinderSlides({
            line: line('mailer', [featured]),
            industry: allIndustriesOption(),
            curatedLines: [line('mailer', [featured])],
            curatedIndustries: [],
        });
        const studySlide = slides.find((slide) => slide.id === 'study-hello-adorn');
        assert.ok(studySlide);
        assert.equal(studySlide.title, 'From Mailer to Reveal');
        assert.equal(
            studySlide.description,
            'Two-format unboxing for Hello Adorn.',
        );
        assert.equal(studySlide.stat, undefined);
    });
});
