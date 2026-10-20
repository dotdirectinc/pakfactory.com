'use client';

import {Boxes, Search} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {SanityImage} from '@/components/ui/sanity-image';
import {isSanityCdnUrl} from '@/lib/sanity/image';

/**
 * One section of the ⌘K dialog body (PROD-3111). Classes are copied from the
 * POC (pakfactory.com-poc `src/shared/components/search/SiteSearch.jsx`,
 * main @ f128375) — sizes, colours and radii — including its `dark` variant
 * for the desktop dialog. This deliberately departs from DESIGN.md's 8pt
 * spacing and tokens inside the search modal only (Richard, 2026-10-20).
 * Radii are the POC's px (its --radius is 16px; ours is 14px). One site rule
 * kept: images sit on the cream `--product-image-bg` well (PROD-3102); the POC's
 * sample images carried their own background, ours are transparent PNGs.
 *
 * Layouts: `grid` products/solutions, `pills` customizations and links,
 * `cards` guides/resources, `lines` the product-lines circles. Every item is
 * reachable with the arrow keys; `index` is its place in the flat list.
 */

export type SearchNavItem = {
    id: string;
    title: string;
    /** Opens this link… */
    href?: string;
    /** …or runs this query instead (product lines, as in the POC). */
    query?: string;
    image?: string | null;
    imageAlt?: string;
    summary?: string;
    label?: string;
    /** Set on search results: reported to `/api/search/click` when opened. */
    track?: {queryID: string; objectID: string; position: number};
};

export type SearchSectionModel = {
    key: string;
    title: string;
    variant: 'grid' | 'pills' | 'cards' | 'lines';
    items: SearchNavItem[];
};

type SectionProps = {
    section: SearchSectionModel;
    startIndex: number;
    activeIndex: number;
    dark: boolean;
    onSelect: (item: SearchNavItem) => void;
};

/** POC radii (Tailwind lg/xl/2xl at --radius 16px). */
export const POC_RADIUS = {lg: 'rounded-[16px]', xl: 'rounded-[20px]', '2xl': 'rounded-[24px]'};

function Thumb({
    src,
    alt,
    sizes,
    dark,
}: {
    src?: string | null;
    alt?: string;
    sizes: string;
    dark: boolean;
}) {
    if (src && isSanityCdnUrl(src)) {
        return (
            <SanityImage src={src} alt={alt ?? ''} fill sizes={sizes} className="bg-[var(--product-image-bg)] object-cover" />
        );
    }
    return (
        <span
            className={cn(
                'flex size-full items-center justify-center',
                dark ? 'bg-white/5 text-white/40' : 'bg-muted text-muted-foreground',
            )}
        >
            <Boxes className="size-5" strokeWidth={1.5} aria-hidden />
        </span>
    );
}

/** Keyboard highlight (not in the POC, which has no arrow-key navigation). */
const active = (dark: boolean) =>
    cn(
        'outline-none data-[active=true]:ring-2 focus-visible:ring-2',
        dark
            ? 'data-[active=true]:ring-white/50 focus-visible:ring-white/50'
            : 'data-[active=true]:ring-foreground/40 focus-visible:ring-foreground/40',
    );

export function SiteSearchSection({
    section,
    startIndex,
    activeIndex,
    dark,
    onSelect,
}: SectionProps) {
    const {variant, items} = section;
    if (!items.length) return null;
    const isActive = (i: number) => startIndex + i === activeIndex;
    const common = (item: SearchNavItem, i: number) => ({
        type: 'button' as const,
        'data-active': isActive(i),
        'data-search-index': startIndex + i,
        onClick: () => onSelect(item),
    });

    return (
        <section className="space-y-3" aria-label={section.title}>
            <h3 className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-foreground')}>
                {section.title}
            </h3>

            {variant === 'lines' ? (
                <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'flex w-16 shrink-0 flex-col items-center gap-2 text-center',
                                POC_RADIUS.lg,
                                active(dark),
                            )}
                        >
                            <span
                                className={cn(
                                    'relative size-14 overflow-hidden rounded-full',
                                    dark ? 'ring-1 ring-white/15' : 'ring-1 ring-border',
                                )}
                            >
                                <Thumb src={item.image} alt="" sizes="56px" dark={dark} />
                            </span>
                            <span
                                className={cn(
                                    'text-[11px] leading-tight font-medium',
                                    dark ? 'text-white/80' : 'text-foreground',
                                )}
                            >
                                {item.title}
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            {variant === 'grid' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'group flex flex-col overflow-hidden text-left align-top transition-colors',
                                POC_RADIUS.xl,
                                dark
                                    ? 'bg-white/5 hover:bg-white/10'
                                    : 'bg-muted/60 hover:bg-muted',
                                active(dark),
                            )}
                        >
                            <span className="relative block aspect-[4/3] overflow-hidden">
                                <Thumb
                                    src={item.image}
                                    alt={item.imageAlt}
                                    sizes="(min-width: 768px) 180px, 45vw"
                                    dark={dark}
                                />
                            </span>
                            <span className="block p-2.5">
                                <span
                                    className={cn(
                                        'line-clamp-2 text-xs font-medium',
                                        dark ? 'text-white' : 'text-foreground',
                                    )}
                                >
                                    {item.title}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            {variant === 'pills' ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                // POC Button outline size sm + `h-8 rounded-full`.
                                'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all',
                                dark
                                    ? 'border-white/15 bg-transparent text-white/90 hover:bg-white/10'
                                    : 'border-border bg-background text-foreground hover:bg-muted',
                                active(dark),
                            )}
                        >
                            {item.title}
                        </button>
                    ))}
                </div>
            ) : null}

            {variant === 'cards' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'flex gap-3 overflow-hidden p-3 text-left transition-colors',
                                POC_RADIUS.xl,
                                dark
                                    ? 'bg-white/5 hover:bg-white/10'
                                    : 'border border-border bg-background hover:bg-muted/50',
                                active(dark),
                            )}
                        >
                            <span
                                className={cn(
                                    'relative size-16 shrink-0 overflow-hidden',
                                    POC_RADIUS.lg,
                                )}
                            >
                                <Thumb
                                    src={item.image}
                                    alt={item.imageAlt}
                                    sizes="64px"
                                    dark={dark}
                                />
                            </span>
                            <span className="min-w-0">
                                <span
                                    className={cn(
                                        'block text-sm font-semibold',
                                        dark ? 'text-white' : 'text-foreground',
                                    )}
                                >
                                    {item.title}
                                </span>
                                {item.summary ? (
                                    <span
                                        className={cn(
                                            'mt-1 line-clamp-2 block text-xs',
                                            dark ? 'text-white/55' : 'text-muted-foreground',
                                        )}
                                    >
                                        {item.summary}
                                    </span>
                                ) : null}
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

/** Recent + curated query chips (not in the arrow-key list, like the POC). */
export function SiteSearchChips({
    chips,
    dark,
    onSelect,
}: {
    chips: string[];
    dark: boolean;
    onSelect: (chip: string) => void;
}) {
    if (!chips.length) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
                <button
                    key={chip}
                    type="button"
                    onClick={() => onSelect(chip)}
                    className={cn(
                        // POC Button outline size sm + `h-7 rounded-full px-3 text-xs font-medium`.
                        'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2',
                        dark
                            ? 'border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white focus-visible:ring-white/50'
                            : 'border-border bg-background text-foreground hover:bg-muted focus-visible:ring-foreground/40',
                    )}
                >
                    <Search className="size-3 opacity-60" strokeWidth={2} aria-hidden />
                    {chip}
                </button>
            ))}
        </div>
    );
}
