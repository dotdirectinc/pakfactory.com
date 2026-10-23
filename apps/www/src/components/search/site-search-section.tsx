'use client';

import {Fragment} from 'react';
import {ArrowUpRight, Boxes, Clock, Search, X} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {SanityImage} from '@/components/ui/sanity-image';
import {pickCardHoverStill} from '@/lib/catalog/card-hover-still';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {
    mediaDissolveHoverInClass,
    mediaDissolveRestHoverOutClass,
} from '@/lib/ui/media-dissolve';

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
 * `cards` guides/resources, `lines` the product-lines circles, `list` the
 * Basic mode's rows (recent searches, suggestions — not in the POC). Every item
 * is reachable with the arrow keys; `index` is its place in the flat list.
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
    /** Product `images[1]` — product grid thumbs only (PROD-3130). */
    hoverImage?: string | null;
    summary?: string;
    /** Product SKU (PROD-3154): beside the title in `list` rows, under it on `grid` cards. */
    sku?: string;
    label?: string;
    /** `list` rows: a recent search (clock icon, removable) or "see all" (search icon). */
    icon?: 'recent' | 'search';
    /** Set on search results: reported to `/api/search/click` when opened. */
    track?: {queryID: string; objectID: string; position: number};
};

export type SearchSectionModel = {
    key: string;
    title: string;
    variant: 'grid' | 'pills' | 'cards' | 'lines' | 'list';
    items: SearchNavItem[];
    /** Optional control beside the heading (e.g. "Clear" on recent searches). */
    action?: {label: string; onClick: () => void};
    /** Hide the heading visually (it stays the region's accessible name). */
    hideTitle?: boolean;
};

type SectionProps = {
    section: SearchSectionModel;
    startIndex: number;
    activeIndex: number;
    /** The item being opened: shows "Opening…" until the new page renders. */
    pendingId?: string | null;
    dark: boolean;
    onSelect: (item: SearchNavItem) => void;
    /** Hover / focus: warm the page before the click. */
    onPrefetch?: (item: SearchNavItem) => void;
    /** `list` rows with `icon: 'recent'`: remove that recent search. */
    onRemove?: (item: SearchNavItem) => void;
    /** `list` rows: words to bold in titles (the typed query). */
    highlight?: string;
};

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bold the typed words inside a title (client-side; the API returns no highlights). */
function Highlighted({text, query, dark}: {text: string; query?: string; dark: boolean}) {
    const words = (query ?? '')
        .split(' ')
        .filter((w) => w.length >= 2)
        .map(escapeRegExp);
    if (!words.length) return <>{text}</>;
    const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <strong
                        key={i}
                        className={cn('font-semibold', dark ? 'text-white' : 'text-foreground')}
                    >
                        {part}
                    </strong>
                ) : (
                    <Fragment key={i}>{part}</Fragment>
                ),
            )}
        </>
    );
}

/** POC radii (Tailwind lg/xl/2xl at --radius 16px). */
export const POC_RADIUS = {lg: 'rounded-[16px]', xl: 'rounded-[20px]', '2xl': 'rounded-[24px]'};

function Thumb({
    src,
    alt,
    hoverSrc,
    sizes,
    dark,
}: {
    src?: string | null;
    alt?: string;
    hoverSrc?: string | null;
    sizes: string;
    dark: boolean;
}) {
    const hover =
        src && hoverSrc && isSanityCdnUrl(hoverSrc)
            ? pickCardHoverStill(src, {src: hoverSrc})
            : null;
    if (src && isSanityCdnUrl(src)) {
        return (
            <>
                <SanityImage
                    src={src}
                    alt={alt ?? ''}
                    fill
                    sizes={sizes}
                    className={cn(
                        'bg-[var(--product-image-bg)] object-cover',
                        hover && mediaDissolveRestHoverOutClass,
                    )}
                />
                {hover ? (
                    <SanityImage
                        src={hover.src}
                        alt=""
                        fill
                        sizes={sizes}
                        className={cn(
                            'bg-[var(--product-image-bg)] object-cover',
                            mediaDissolveHoverInClass,
                        )}
                    />
                ) : null}
            </>
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
        'outline-none data-[active=true]:ring-2 focus-visible:ring-2 disabled:cursor-wait data-[pending]:animate-pulse data-[pending]:ring-2',
        dark
            ? 'data-[active=true]:ring-white/50 focus-visible:ring-white/50'
            : 'data-[active=true]:ring-foreground/40 focus-visible:ring-foreground/40',
    );

export function SiteSearchSection({
    section,
    startIndex,
    activeIndex,
    pendingId,
    dark,
    onSelect,
    onPrefetch,
    onRemove,
    highlight,
}: SectionProps) {
    const {variant, items} = section;
    if (!items.length) return null;
    const isActive = (i: number) => startIndex + i === activeIndex;
    const common = (item: SearchNavItem, i: number) => ({
        type: 'button' as const,
        'data-active': isActive(i),
        'data-search-index': startIndex + i,
        'data-pending': pendingId === item.id || undefined,
        'aria-busy': pendingId === item.id || undefined,
        disabled: Boolean(pendingId),
        onClick: () => onSelect(item),
        onPointerEnter: () => onPrefetch?.(item),
        onFocus: () => onPrefetch?.(item),
    });

    return (
        <section className="space-y-3" aria-label={section.title}>
            <div
                className={cn(
                    'flex items-center justify-between gap-2',
                    section.hideTitle && !section.action && 'sr-only',
                )}
            >
                <h3
                    className={cn(
                        variant === 'list'
                            ? 'text-xs font-medium tracking-wide uppercase'
                            : 'text-sm font-semibold',
                        variant === 'list'
                            ? dark
                                ? 'text-white/45'
                                : 'text-muted-foreground'
                            : dark
                              ? 'text-white'
                              : 'text-foreground',
                        section.hideTitle && 'sr-only',
                    )}
                >
                    {section.title}
                </h3>
                {section.action ? (
                    <button
                        type="button"
                        onClick={section.action.onClick}
                        className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2',
                            dark
                                ? 'text-white/55 hover:text-white focus-visible:ring-white/50'
                                : 'text-muted-foreground hover:text-foreground focus-visible:ring-foreground/40',
                        )}
                    >
                        {section.action.label}
                    </button>
                ) : null}
            </div>

            {variant === 'list' ? (
                <ul className="-mx-2 space-y-0.5">
                    {items.map((item, i) => {
                        const LeadIcon =
                            item.icon === 'recent'
                                ? Clock
                                : item.icon === 'search'
                                  ? Search
                                  : null;
                        return (
                            <li key={item.id} className="group/row relative flex items-center">
                                <button
                                    {...common(item, i)}
                                    className={cn(
                                        'flex min-h-11 w-full min-w-0 items-center gap-3 px-2 py-1.5 text-left text-sm transition-colors',
                                        POC_RADIUS.lg,
                                        dark
                                            ? 'text-white/75 hover:bg-white/5 data-[active=true]:bg-white/10'
                                            : 'text-muted-foreground hover:bg-muted data-[active=true]:bg-muted',
                                        item.icon === 'recent' && onRemove && 'pr-10',
                                        active(dark),
                                    )}
                                >
                                    {LeadIcon ? (
                                        <LeadIcon
                                            className={cn(
                                                'size-4 shrink-0',
                                                dark ? 'text-white/40' : 'text-muted-foreground',
                                            )}
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                    ) : (
                                        <span
                                            className={cn(
                                                'relative size-9 shrink-0 overflow-hidden',
                                                'rounded-[10px]',
                                            )}
                                        >
                                            <Thumb
                                                src={item.image}
                                                alt=""
                                                sizes="36px"
                                                dark={dark}
                                            />
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'min-w-0 flex-1 truncate',
                                            item.icon
                                                ? dark
                                                    ? 'text-white/90'
                                                    : 'text-foreground'
                                                : undefined,
                                        )}
                                    >
                                        <Highlighted
                                            text={item.title}
                                            query={item.icon ? undefined : highlight}
                                            dark={dark}
                                        />
                                    </span>
                                    {item.sku ? (
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs tabular-nums',
                                                dark ? 'text-white/55' : 'text-muted-foreground',
                                            )}
                                        >
                                            <Highlighted
                                                text={item.sku}
                                                query={highlight}
                                                dark={dark}
                                            />
                                        </span>
                                    ) : null}
                                    {item.label ? (
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs',
                                                dark ? 'text-white/40' : 'text-muted-foreground',
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                    ) : null}
                                    {item.icon === 'search' ? (
                                        <ArrowUpRight
                                            className="size-4 shrink-0 opacity-0 group-hover/row:opacity-60"
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                    ) : null}
                                </button>
                                {item.icon === 'recent' && onRemove ? (
                                    <button
                                        type="button"
                                        aria-label={`Remove “${item.title}” from recent searches`}
                                        onClick={() => onRemove(item)}
                                        className={cn(
                                            'absolute right-1.5 inline-flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2',
                                            dark
                                                ? 'text-white/40 hover:bg-white/10 hover:text-white focus-visible:ring-white/50'
                                                : 'text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-foreground/40',
                                        )}
                                    >
                                        <X className="size-3.5" strokeWidth={2} aria-hidden />
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}

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
                                    hoverSrc={item.hoverImage}
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
                                {item.sku ? (
                                    <span
                                        className={cn(
                                            'mt-0.5 block text-[11px] tabular-nums',
                                            dark ? 'text-white/55' : 'text-muted-foreground',
                                        )}
                                    >
                                        {item.sku}
                                    </span>
                                ) : null}
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
