'use client';

import {useMemo} from 'react';
import {Label} from '@pakfactory/ui/components/label';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';

import {NewsListItem} from '@/components/newsroom/news-list-item';
import {CatalogTabBar, type CatalogTab} from '@/components/ui/catalog-tab-bar';
import {MediaTileCard} from '@/components/ui/media-tile-card';
import {ViewToggle, type CatalogView} from '@/components/ui/view-toggle';
import {
    useCatalogQueryState,
    type CatalogExtraParamDef,
} from '@/lib/catalog/use-catalog-query-state';
import type {NewsCard} from '@/lib/newsroom/types';

const ALL = 'all';

/** URL params (module constant — the hook keys effects on identity). */
const EXTRA_PARAMS: Record<string, CatalogExtraParamDef> = {
    view: {param: 'view', defaultValue: 'list'},
    year: {param: 'year', defaultValue: ALL},
    category: {param: 'category', defaultValue: ALL},
};

const NO_FACETS: string[] = [];

const YEAR_ID = 'newsroom-year';
const CATEGORY_ID = 'newsroom-category';

/** Media assets (mockup's second tab) has no content model yet — Announcements only. */
const ANNOUNCEMENTS_TAB = 'announcements';
const TABS: CatalogTab[] = [{id: ANNOUNCEMENTS_TAB, label: 'Announcements'}];

type NewsCatalogPanelProps = {
    items: NewsCard[];
};

function asView(value: string | undefined): CatalogView {
    return value === 'grid' ? 'grid' : 'list';
}

/**
 * `/newsroom` list (PROD-2913): Announcements tab bar carrying the category +
 * year filters and list/grid toggle,
 * all mirrored to the URL (`?year=2026&category=award&view=grid`) the same way
 * the customization catalog syncs. Filtering is client-side: the newsroom
 * publishes a handful of releases a year, so the whole archive ships in the
 * static HTML.
 */
export function NewsCatalogPanel({items}: NewsCatalogPanelProps) {
    const {extras, setExtra, urlSyncListener} = useCatalogQueryState({
        facetIds: NO_FACETS,
        extraParams: EXTRA_PARAMS,
    });

    const view = asView(extras.view);
    const years = useMemo(
        () =>
            [...new Set(items.map((item) => item.year))].sort((a, b) =>
                b.localeCompare(a),
            ),
        [items],
    );
    const categories = useMemo(() => {
        const seen = new Map<string, string>();
        for (const item of items) {
            if (item.category && item.categoryLabel) {
                seen.set(item.category, item.categoryLabel);
            }
        }
        return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
    }, [items]);

    // A deep link to a year or category with no releases falls back to All.
    const year = years.includes(extras.year ?? '') ? extras.year! : ALL;
    const category = categories.some(([id]) => id === extras.category)
        ? extras.category!
        : ALL;

    const visible = items.filter(
        (item) =>
            (year === ALL || item.year === year) &&
            (category === ALL || item.category === category),
    );

    const emptyMessage =
        items.length === 0
            ? 'No announcements yet.'
            : category === ALL
              ? 'No announcements for this year yet.'
              : 'No announcements match these filters.';

    return (
        <PageDielineSection innerClassName="pb-16 pt-8 md:pb-24 md:pt-12">
            {urlSyncListener}
            <CatalogTabBar
                tabs={TABS}
                value={ANNOUNCEMENTS_TAB}
                aria-label="Newsroom"
                // Centred reading column (~1000px), as in the mockup; the skeleton matches.
                className="mx-auto w-full max-w-5xl"
                actions={
                    <>
                        {categories.length > 1 ? (
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor={CATEGORY_ID}
                                    className="font-normal text-muted-foreground"
                                >
                                    Category
                                </Label>
                                <Select
                                    value={category}
                                    onValueChange={(next) =>
                                        setExtra('category', next)
                                    }
                                >
                                    <SelectTrigger id={CATEGORY_ID} className="w-48">
                                        {/* Explicit label so the server HTML is not blank before hydration. */}
                                        <SelectValue>
                                            {categories.find(([id]) => id === category)?.[1] ??
                                                'All'}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All</SelectItem>
                                        {categories.map(([id, label]) => (
                                            <SelectItem key={id} value={id}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        {years.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor={YEAR_ID}
                                    className="font-normal text-muted-foreground"
                                >
                                    Year
                                </Label>
                                <Select
                                    value={year}
                                    onValueChange={(next) => setExtra('year', next)}
                                >
                                    <SelectTrigger id={YEAR_ID} className="w-28">
                                        <SelectValue>
                                            {year === ALL ? 'All' : year}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All</SelectItem>
                                        {years.map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        <ViewToggle
                            value={view}
                            onValueChange={(next) => setExtra('view', next)}
                            aria-label="Announcements layout"
                        />
                    </>
                }
            >
                {visible.length === 0 ? (
                    <p
                        role="status"
                        className="py-12 text-center text-sm text-muted-foreground"
                    >
                        {emptyMessage}
                    </p>
                ) : view === 'grid' ? (
                    <ul className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                        {visible.map((item) => (
                            <li key={item.id}>
                                <MediaTileCard
                                    href={item.href}
                                    title={item.title}
                                    description={item.summary || undefined}
                                    eyebrow={item.dateLabel}
                                    align="left"
                                    ctaLabel="Read more"
                                    imageSrc={item.image?.src}
                                    imageAlt={item.image?.alt}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul>
                        {visible.map((item) => (
                            <li key={item.id}>
                                <NewsListItem item={item} />
                            </li>
                        ))}
                    </ul>
                )}
            </CatalogTabBar>
        </PageDielineSection>
    );
}
