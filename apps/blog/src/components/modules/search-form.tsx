'use client';

import {Search} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import {Input} from '@pakfactory/ui/components/input';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    SearchSuggestionPanel,
    searchSuggestionOptionId,
} from '@/components/ui/search-suggestion-panel';
import {sitePath} from '@/lib/site';
import {
    fetchSearchSuggestBundle,
    isAlgoliaSuggestEnabled,
    SEARCH_SUGGEST_DEBOUNCE_MS,
    SEARCH_SUGGEST_MIN_QUERY_LENGTH,
    SEARCH_SUGGEST_TABS,
    type SearchSuggestion,
    type SearchSuggestTab,
} from '@/lib/algolia-suggest';

type SearchFormProps = {
    defaultQuery?: string;
    className?: string;
};

/** Inline GET search — targets `/search` (PROD-1503). Reuse on 404 and zero-results. */
export function SearchForm({defaultQuery = '', className}: SearchFormProps) {
    return (
        <form action={sitePath('/search')} method="get" className={className}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="blog-search-q" className="sr-only">
                    Search the blog
                </label>
                <Input
                    id="blog-search-q"
                    name="q"
                    type="search"
                    placeholder="Search articles…"
                    defaultValue={defaultQuery}
                    className="min-w-0 flex-1"
                />
                <Button type="submit">Search</Button>
            </div>
        </form>
    );
}

type NavSearchFormProps = {
    id?: string;
    defaultQuery?: string;
    className?: string;
    fieldClassName?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    autoFocus?: boolean;
    placeholder?: string;
    showSubmit?: boolean;
    submitLabel?: string;
};

/** Pill GET search for site nav — targets `/search`. Reuse in desktop category row and compact overlay. */
export function NavSearchForm(props: NavSearchFormProps) {
    if (isAlgoliaSuggestEnabled()) {
        return <NavSearchFormTypeahead {...props} />;
    }
    return <NavSearchFormPlain {...props} />;
}

function NavSearchFormPlain({
    id = 'site-nav-search',
    defaultQuery = '',
    className,
    fieldClassName,
    inputRef,
    autoFocus,
    placeholder = "What you'd like to read?",
    showSubmit = false,
    submitLabel = 'Search',
}: NavSearchFormProps) {
    const field = (
        <div className={cn('relative', showSubmit ? 'min-w-0 flex-1' : fieldClassName)}>
            <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
            />
            <Input
                ref={inputRef}
                id={id}
                name="q"
                type="search"
                placeholder={placeholder}
                defaultValue={defaultQuery}
                autoFocus={autoFocus}
                className="h-10 rounded-full border-input bg-background pr-3 pl-9 shadow-none"
            />
        </div>
    );

    return (
        <form action={sitePath('/search')} method="get" className={className}>
            <label htmlFor={id} className="sr-only">
                {placeholder}
            </label>
            {showSubmit ? (
                <div className={cn('flex items-center gap-2', fieldClassName)}>
                    {field}
                    <Button
                        type="submit"
                        className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        {submitLabel}
                    </Button>
                </div>
            ) : (
                field
            )}
        </form>
    );
}

const EMPTY_TAB_COUNTS: Record<SearchSuggestTab, number> = {
    all: 0,
    posts: 0,
    categories: 0,
    topics: 0,
};

function NavSearchFormTypeahead({
    id = 'site-nav-search',
    defaultQuery = '',
    className,
    fieldClassName,
    inputRef,
    autoFocus,
    placeholder = "What you'd like to read?",
    showSubmit = false,
    submitLabel = 'Search',
}: NavSearchFormProps) {
    const router = useRouter();
    const listboxId = `${id}-listbox`;
    const tablistId = `${id}-tabs`;
    const containerRef = useRef<HTMLDivElement>(null);
    const localInputRef = useRef<HTMLInputElement>(null);
    const mergedInputRef = inputRef ?? localInputRef;

    const [query, setQuery] = useState(defaultQuery);
    const [activeTab, setActiveTab] = useState<SearchSuggestTab>('all');
    const [items, setItems] = useState<SearchSuggestion[]>([]);
    const [tabCounts, setTabCounts] =
        useState<Record<SearchSuggestTab, number>>(EMPTY_TAB_COUNTS);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const trimmedQuery = query.trim();
    const panelVisible =
        isOpen &&
        trimmedQuery.length >= SEARCH_SUGGEST_MIN_QUERY_LENGTH &&
        (isLoading || hasFetched);

    const closePanel = useCallback(() => {
        setIsOpen(false);
        setActiveIndex(-1);
    }, []);

    const navigateToSearch = useCallback(() => {
        const q = trimmedQuery;
        if (!q) return;
        closePanel();
        router.push(`/search?q=${encodeURIComponent(q)}`);
    }, [closePanel, router, trimmedQuery]);

    const selectSuggestion = useCallback(
        (item: SearchSuggestion) => {
            closePanel();
            setQuery(item.title);
            router.push(item.href);
        },
        [closePanel, router],
    );

    const clearQuery = useCallback(() => {
        setQuery('');
        setItems([]);
        setTabCounts(EMPTY_TAB_COUNTS);
        setIsLoading(false);
        setHasFetched(false);
        setActiveIndex(-1);
        closePanel();
        mergedInputRef.current?.focus();
    }, [closePanel, mergedInputRef]);

    const handleTabChange = useCallback((tab: SearchSuggestTab) => {
        setActiveTab(tab);
        setActiveIndex(-1);
        setIsOpen(true);
    }, []);

    useEffect(() => {
        if (trimmedQuery.length < SEARCH_SUGGEST_MIN_QUERY_LENGTH) {
            setItems([]);
            setTabCounts(EMPTY_TAB_COUNTS);
            setIsLoading(false);
            setHasFetched(false);
            setActiveIndex(-1);
            return;
        }

        setIsLoading(true);
        setHasFetched(false);
        const handle = window.setTimeout(() => {
            void fetchSearchSuggestBundle(trimmedQuery, activeTab).then(
                (bundle) => {
                    setItems(bundle.items);
                    setTabCounts(bundle.counts);
                    setIsLoading(false);
                    setHasFetched(true);
                    setActiveIndex(-1);
                },
            );
        }, SEARCH_SUGGEST_DEBOUNCE_MS);

        return () => window.clearTimeout(handle);
    }, [trimmedQuery, activeTab]);

    useEffect(() => {
        if (!panelVisible) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                closePanel();
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [closePanel, panelVisible]);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!panelVisible && event.key === 'ArrowDown' && items.length > 0) {
            setIsOpen(true);
            setActiveIndex(0);
            event.preventDefault();
            return;
        }

        if (!panelVisible) return;

        switch (event.key) {
            case 'ArrowDown': {
                event.preventDefault();
                if (items.length === 0) return;
                setActiveIndex((current) =>
                    current < items.length - 1 ? current + 1 : 0,
                );
                break;
            }
            case 'ArrowUp': {
                event.preventDefault();
                if (items.length === 0) return;
                setActiveIndex((current) =>
                    current > 0 ? current - 1 : items.length - 1,
                );
                break;
            }
            case 'Escape': {
                event.preventDefault();
                closePanel();
                break;
            }
            case 'Enter': {
                if (activeIndex >= 0 && items[activeIndex]) {
                    event.preventDefault();
                    selectSuggestion(items[activeIndex]);
                }
                break;
            }
            default:
                break;
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        if (activeIndex >= 0 && items[activeIndex]) {
            event.preventDefault();
            selectSuggestion(items[activeIndex]);
            return;
        }
        event.preventDefault();
        navigateToSearch();
    };

    const showClear = query.length > 0;

    const field = (
        <div
            ref={containerRef}
            className={cn('relative', showSubmit ? 'min-w-0 flex-1' : fieldClassName)}
        >
            <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
            />
            <Input
                ref={mergedInputRef}
                id={id}
                name="q"
                type="search"
                role="combobox"
                aria-expanded={panelVisible}
                aria-controls={panelVisible ? listboxId : undefined}
                aria-activedescendant={
                    panelVisible && activeIndex >= 0
                        ? searchSuggestionOptionId(listboxId, activeIndex)
                        : undefined
                }
                aria-autocomplete="list"
                autoComplete="off"
                placeholder={placeholder}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (trimmedQuery.length >= SEARCH_SUGGEST_MIN_QUERY_LENGTH) {
                        setIsOpen(true);
                    }
                }}
                onKeyDown={handleKeyDown}
                autoFocus={autoFocus}
                className={cn(
                    'h-10 rounded-full border-input bg-background pl-9 shadow-none',
                    '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
                    showClear ? 'pr-16' : 'pr-3',
                )}
            />
            {showClear ? (
                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearQuery}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                    Clear
                </button>
            ) : null}
            {panelVisible ? (
                <SearchSuggestionPanel
                    listboxId={listboxId}
                    tablistId={tablistId}
                    tabs={SEARCH_SUGGEST_TABS}
                    activeTab={activeTab}
                    tabCounts={tabCounts}
                    onTabChange={handleTabChange}
                    items={items}
                    activeIndex={activeIndex}
                    isLoading={isLoading}
                    query={query}
                    onSelect={selectSuggestion}
                    onViewAll={navigateToSearch}
                />
            ) : null}
        </div>
    );

    return (
        <form action={sitePath('/search')} method="get" className={className} onSubmit={handleSubmit}>
            <label htmlFor={id} className="sr-only">
                {placeholder}
            </label>
            {showSubmit ? (
                <div className={cn('flex items-center gap-2', fieldClassName)}>
                    {field}
                    <Button
                        type="submit"
                        className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        {submitLabel}
                    </Button>
                </div>
            ) : (
                field
            )}
        </form>
    );
}
