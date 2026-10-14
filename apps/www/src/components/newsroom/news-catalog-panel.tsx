'use client';

import {useMemo} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';

import {NewsListItem} from '@/components/newsroom/news-list-item';
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

const HEADING_ID = 'newsroom-announcements-heading';

type NewsCatalogPanelProps = {
    items: NewsCard[];
};

function asView(value: string | undefined): CatalogView {
    return value === 'grid' ? 'grid' : 'list';
}

/**
 * `/newsroom` list (PROD-2913): year + category filters, list/grid toggle,
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
            <section aria-labelledby={HEADING_ID}>
                <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-2">
                        <h2
                            id={HEADING_ID}
                            className="text-3xl font-semibold leading-tight tracking-tight text-foreground"
                        >
                            Announcements
                        </h2>
                        <p className="text-base text-muted-foreground">
                            Press releases and company news from PakFactory.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {categories.length > 1 ? (
                            <Select
                                value={category}
                                onValueChange={(next) =>
                                    setExtra('category', next)
                                }
                            >
                                <SelectTrigger
                                    className="w-52"
                                    aria-label="Filter announcements by category"
                                >
                                    {/* Explicit label so the server HTML is not blank before hydration. */}
                                    <SelectValue>
                                        {categories.find(([id]) => id === category)?.[1] ??
                                            'All categories'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>
                                        All categories
                                    </SelectItem>
                                    {categories.map(([id, label]) => (
                                        <SelectItem key={id} value={id}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}
                        {years.length > 0 ? (
                            <Select
                                value={year}
                                onValueChange={(next) => setExtra('year', next)}
                            >
                                <SelectTrigger
                                    className="w-32"
                                    aria-label="Filter announcements by year"
                                >
                                    <SelectValue>
                                        {year === ALL ? 'All years' : year}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All years</SelectItem>
                                    {years.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}
                        <ViewToggle
                            value={view}
                            onValueChange={(next) => setExtra('view', next)}
                            aria-label="Announcements layout"
                        />
                    </div>
                </div>

                {visible.length === 0 ? (
                    <p
                        role="status"
                        className="py-16 text-center text-base text-muted-foreground"
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
            </section>
        </PageDielineSection>
    );
}
