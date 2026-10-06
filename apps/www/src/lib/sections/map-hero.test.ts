import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {
    PageSectionHeroFinderDoc,
    PageSectionHeroFinderIndustryDoc,
    PageSectionHeroFinderLineDoc,
} from '@pakfactory/sanity/queries';

import {mapHeroFinder} from './map-hero';

const line = (
    id: string,
    status?: string | null,
): PageSectionHeroFinderLineDoc => ({
    _id: id,
    _type: 'productLine',
    title: id,
    slug: id,
    ...(status !== undefined ? {status} : {}),
});

const industry = (
    id: string,
    status?: string | null,
): PageSectionHeroFinderIndustryDoc => ({
    _id: id,
    _type: 'solution',
    title: id,
    slug: id,
    ...(status !== undefined ? {status} : {}),
});

const finder = (
    extras: Partial<PageSectionHeroFinderDoc> = {},
): PageSectionHeroFinderDoc => ({
    _type: 'heroFinder',
    _key: 'finder',
    headingLead: 'Find',
    headingJoin: 'for',
    productLines: [line('boxes', 'active'), line('pouches', 'active')],
    industries: [industry('beauty', 'active'), industry('food', 'active')],
    ...extras,
});

describe('mapHeroFinder — status gates (PROD-2845)', () => {
    it('keeps active lines and industries', () => {
        const mapped = mapHeroFinder(finder());
        assert.ok(mapped);
        assert.deepEqual(
            mapped.lines.map((l) => l.slug),
            ['boxes', 'pouches'],
        );
        assert.deepEqual(
            mapped.industries.map((i) => i.slug),
            ['beauty', 'food'],
        );
    });

    it('keeps a line with unset status (LINE_STYLE_ACTIVE treats unset as active)', () => {
        const mapped = mapHeroFinder(
            finder({
                productLines: [line('boxes'), line('pouches', 'active')],
            }),
        );
        assert.ok(mapped);
        assert.deepEqual(
            mapped.lines.map((l) => l.slug),
            ['boxes', 'pouches'],
        );
    });

    it('drops coming-soon and active-internal lines', () => {
        const mapped = mapHeroFinder(
            finder({
                productLines: [
                    line('boxes', 'active'),
                    line('coming', 'coming-soon'),
                    line('internal', 'active-internal'),
                    line('pouches', 'active'),
                ],
            }),
        );
        assert.ok(mapped);
        assert.deepEqual(
            mapped.lines.map((l) => l.slug),
            ['boxes', 'pouches'],
        );
    });

    it('keeps only active industries; drops unset, not-active, and coming-soon', () => {
        const mapped = mapHeroFinder(
            finder({
                industries: [
                    industry('beauty', 'active'),
                    industry('unset'),
                    industry('off', 'not-active'),
                    industry('soon', 'coming-soon'),
                    industry('food', 'active'),
                ],
            }),
        );
        assert.ok(mapped);
        assert.deepEqual(
            mapped.industries.map((i) => i.slug),
            ['beauty', 'food'],
        );
    });

    it('returns null when every industry is dropped (needs two of each)', () => {
        assert.equal(
            mapHeroFinder(
                finder({
                    industries: [
                        industry('unset'),
                        industry('off', 'not-active'),
                    ],
                }),
            ),
            null,
        );
    });

    it('returns null when every line is dropped', () => {
        assert.equal(
            mapHeroFinder(
                finder({
                    productLines: [
                        line('coming', 'coming-soon'),
                        line('internal', 'active-internal'),
                    ],
                }),
            ),
            null,
        );
    });
});
