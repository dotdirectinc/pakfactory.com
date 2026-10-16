'use client';

import {useMemo} from 'react';
import {ChevronDownIcon} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {Label} from '@pakfactory/ui/components/label';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {NewsListItem} from '@/components/newsroom/news-list-item';
import {CatalogTabBar, type CatalogTab} from '@/components/ui/catalog-tab-bar';
import {MediaTileCard} from '@/components/ui/media-tile-card';
import {SectionHeading} from '@/components/ui/section-heading';
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
};

const NO_FACETS: string[] = [];

/** Trigger keeps Radix's own id (the menu's aria-labelledby points at it). */
const YEAR_LABEL_ID = 'newsroom-year-label';
const YEAR_VALUE_ID = 'newsroom-year-value';

/** Media assets (mockup's second tab) has no content model yet — Announcements only. */
const ANNOUNCEMENTS_TAB = 'announcements';

type NewsCatalogPanelProps = {
    items: NewsCard[];
};

function asView(value: string | undefined): CatalogView {
    return value === 'grid' ? 'grid' : 'list';
}

/**
 * `/newsroom` body (PROD-2913), per `2026-10-13_newsroom-design_2.html`: the
 * catalog tab strip (Announcements + count, list/grid toggle), then the tab's
 * own heading with the Year filter on the right — more content types join
 * later as tabs, each with its own heading. Year and view are mirrored to the
 * URL (`?year=2026&view=grid`) like the customization catalog. Filtering is
 * client-side: the whole archive is a few releases a year.
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

    // A deep link to a year with no releases falls back to All.
    const year = years.includes(extras.year ?? '') ? extras.year! : ALL;
    const visible =
        year === ALL ? items : items.filter((item) => item.year === year);

    const tabs: CatalogTab[] = [
        {id: ANNOUNCEMENTS_TAB, label: 'Announcements', count: items.length},
    ];

    const yearFilter =
        years.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
                <Label
                    id={YEAR_LABEL_ID}
                    className="font-normal text-muted-foreground"
                >
                    Year
                </Label>
                {/* Non-modal menu, not Select: Select locks page scroll and drops
                    the scrollbar, which shifts the page sideways (PROD-2913). */}
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-labelledby={`${YEAR_LABEL_ID} ${YEAR_VALUE_ID}`}
                            className="flex h-9 w-32 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium whitespace-nowrap shadow-xs outline-none focus-visible:border-primary"
                        >
                            <span id={YEAR_VALUE_ID}>
                                {year === ALL ? 'All years' : year}
                            </span>
                            <ChevronDownIcon
                                className="size-4 shrink-0 text-muted-foreground opacity-50"
                                aria-hidden
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-32">
                        <DropdownMenuRadioGroup
                            value={year}
                            onValueChange={(next) => setExtra('year', next)}
                        >
                            <DropdownMenuRadioItem value={ALL}>
                                All years
                            </DropdownMenuRadioItem>
                            {years.map((value) => (
                                <DropdownMenuRadioItem key={value} value={value}>
                                    {value}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        ) : null;

    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="pb-16 sm:pb-20 lg:pb-24"
        >
            {urlSyncListener}
            <CatalogTabBar
                tabs={tabs}
                value={ANNOUNCEMENTS_TAB}
                aria-label="Newsroom sections"
                panelClassName="mt-12"
                actions={
                    <ViewToggle
                        value={view}
                        onValueChange={(next) => setExtra('view', next)}
                        aria-label="Announcements layout"
                    />
                }
            >
                <SectionHeading
                    title="Announcements"
                    description="Company news, press releases and milestones."
                    actions={yearFilter}
                    className="mb-8"
                />
                {visible.length === 0 ? (
                    <p
                        role="status"
                        className="border-t border-dashed border-border py-12 text-center text-sm text-muted-foreground"
                    >
                        {items.length === 0
                            ? 'No announcements yet.'
                            : 'No announcements for this year yet.'}
                    </p>
                ) : view === 'grid' ? (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((item) => (
                            <li key={item.id}>
                                <MediaTileCard
                                    href={item.href}
                                    title={item.title}
                                    description={item.summary || undefined}
                                    eyebrow={item.dateLabel}
                                    ctaLabel="Read more"
                                    imageSrc={item.image?.src}
                                    imageAlt={item.image?.alt}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="flex flex-col border-t border-dashed border-border">
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
