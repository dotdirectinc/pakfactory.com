'use client';

import Image from 'next/image';
import {Folder, Tag} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import type {SearchSuggestion, SearchSuggestTab} from '@/lib/algolia-suggest';
import {SearchHighlight} from '@/components/ui/search-highlight';
import {
    SearchSuggestTabs,
    type SearchSuggestTabOption,
} from '@/components/ui/search-suggest-tabs';

type SearchSuggestionPanelProps = {
    listboxId: string;
    tablistId: string;
    tabs: SearchSuggestTabOption[];
    activeTab: SearchSuggestTab;
    tabCounts: Partial<Record<SearchSuggestTab, number>>;
    onTabChange: (tab: SearchSuggestTab) => void;
    items: SearchSuggestion[];
    activeIndex: number;
    isLoading: boolean;
    query: string;
    onSelect: (item: SearchSuggestion) => void;
    onViewAll?: () => void;
    className?: string;
};

function optionId(listboxId: string, index: number): string {
    return `${listboxId}-option-${index}`;
}

function SuggestionLeading({item}: {item: SearchSuggestion}) {
    if (item.kind === 'post' && item.imageUrl) {
        return (
            <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                    src={item.imageUrl}
                    alt={item.imageAlt ?? ''}
                    fill
                    sizes="40px"
                    className="object-cover"
                />
            </span>
        );
    }

    if (item.kind === 'category') {
        return (
            <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
                <Folder className="size-4" strokeWidth={1.75} />
            </span>
        );
    }

    if (item.kind === 'topic') {
        return (
            <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
                <Tag className="size-4" strokeWidth={1.75} />
            </span>
        );
    }

    return (
        <span aria-hidden className="size-10 shrink-0 rounded-md bg-muted" />
    );
}

/**
 * Presentational typeahead panel with tabs (ADR-013 shared core). Parent owns
 * fetch, keyboard state, and navigation — this renders tabs + rows only.
 */
export function SearchSuggestionPanel({
    listboxId,
    tablistId,
    tabs,
    activeTab,
    tabCounts,
    onTabChange,
    items,
    activeIndex,
    isLoading,
    query,
    onSelect,
    onViewAll,
    className,
}: SearchSuggestionPanelProps) {
    const showEmpty = !isLoading && items.length === 0;
    const showFooter = Boolean(onViewAll && query.trim());
    const trimmedQuery = query.trim();

    return (
        <div
            className={cn(
                'fixed left-4 right-4 top-[calc(var(--nav-search-bottom,4rem)+0.375rem)] z-50 w-auto max-w-none overflow-hidden rounded-xl border border-border bg-background shadow-md',
                'lg:absolute lg:inset-x-auto lg:top-[calc(100%+1.5rem)] lg:right-0 lg:left-auto lg:min-w-full lg:w-md lg:max-w-[calc(100vw-2rem)] lg:rounded-xl lg:border',
                className,
            )}
        >
            <SearchSuggestTabs
                tablistId={tablistId}
                tabs={tabs}
                activeTab={activeTab}
                counts={tabCounts}
                onTabChange={onTabChange}
            />

            <ul
                id={listboxId}
                role="listbox"
                aria-label="Search suggestions"
                aria-labelledby={`${tablistId}-${activeTab}`}
                className="max-h-[320px] overflow-y-auto"
            >
                {isLoading ? (
                    <li
                        role="presentation"
                        className="px-4 py-3 text-sm text-muted-foreground"
                    >
                        Searching…
                    </li>
                ) : null}

                {!isLoading &&
                    items.map((item, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <li key={item.id} role="presentation">
                                <button
                                    type="button"
                                    id={optionId(listboxId, index)}
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => onSelect(item)}
                                    className={cn(
                                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                                        isActive
                                            ? 'bg-muted'
                                            : 'hover:bg-muted/60',
                                    )}
                                >
                                    <SuggestionLeading item={item} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-foreground">
                                            <SearchHighlight
                                                text={item.title}
                                                query={trimmedQuery}
                                            />
                                        </span>
                                        {item.subtitle ? (
                                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                {item.subtitle}
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        );
                    })}

                {showEmpty ? (
                    <li
                        role="presentation"
                        className="px-4 py-3 text-sm text-muted-foreground"
                    >
                        No matches
                    </li>
                ) : null}
            </ul>

            {showFooter ? (
                <div className="border-t border-border px-4 py-2.5">
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={onViewAll}
                        className="w-full text-left text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        View all results for &ldquo;{trimmedQuery}&rdquo;
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export {optionId as searchSuggestionOptionId};
