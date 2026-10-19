'use client';

import {Boxes, Search} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {SanityImage} from '@/components/ui/sanity-image';
import {isSanityCdnUrl} from '@/lib/sanity/image';

/**
 * One section of the ⌘K dialog body (PROD-3111). Layouts follow the POC
 * (pakfactory.com-poc `SiteSearch.jsx`): `grid` for products and solutions,
 * `pills` for customizations and browse links, `cards` for guides and
 * resources, `lines` for the product-lines circles. Every item is reachable
 * with the arrow keys; `index` is its place in the dialog's flat list.
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
    onSelect: (item: SearchNavItem) => void;
};

function Thumb({src, alt, sizes}: {src?: string | null; alt?: string; sizes: string}) {
    if (src && isSanityCdnUrl(src)) {
        return (
            <SanityImage src={src} alt={alt ?? ''} fill sizes={sizes} className="object-cover" />
        );
    }
    return (
        <span className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            <Boxes className="size-5" strokeWidth={1.5} aria-hidden />
        </span>
    );
}

const itemFocus =
    'outline-none transition-colors data-[active=true]:ring-2 data-[active=true]:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground/40';

export function SiteSearchSection({section, startIndex, activeIndex, onSelect}: SectionProps) {
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
        <section className="space-y-4" aria-label={section.title}>
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>

            {variant === 'lines' ? (
                <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'flex w-16 shrink-0 flex-col items-center gap-2 rounded-lg text-center',
                                itemFocus,
                            )}
                        >
                            <span className="relative size-14 overflow-hidden rounded-full bg-[var(--product-image-bg)] ring-1 ring-border">
                                <Thumb src={item.image} alt="" sizes="56px" />
                            </span>
                            <span className="text-xs leading-tight font-medium text-muted-foreground">
                                {item.title}
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            {variant === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'group flex flex-col overflow-hidden rounded-lg bg-muted/60 text-left align-top hover:bg-muted',
                                itemFocus,
                            )}
                        >
                            <span className="relative block aspect-[4/3] overflow-hidden bg-[var(--product-image-bg)]">
                                <Thumb
                                    src={item.image}
                                    alt={item.imageAlt}
                                    sizes="(min-width: 768px) 180px, 45vw"
                                />
                            </span>
                            <span className="block p-2">
                                {item.label ? (
                                    <span className="block text-[11px] text-muted-foreground">
                                        {item.label}
                                    </span>
                                ) : null}
                                <span className="line-clamp-2 text-xs font-medium text-foreground">
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
                                'inline-flex h-8 items-center rounded-full border border-border px-4 text-sm text-foreground hover:bg-muted',
                                itemFocus,
                            )}
                        >
                            {item.title}
                        </button>
                    ))}
                </div>
            ) : null}

            {variant === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            {...common(item, i)}
                            className={cn(
                                'flex gap-4 overflow-hidden rounded-lg bg-muted/60 p-2 text-left hover:bg-muted',
                                itemFocus,
                            )}
                        >
                            <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-[var(--product-image-bg)]">
                                <Thumb src={item.image} alt={item.imageAlt} sizes="64px" />
                            </span>
                            <span className="min-w-0">
                                {item.label ? (
                                    <span className="block text-[11px] text-muted-foreground">
                                        {item.label}
                                    </span>
                                ) : null}
                                <span className="block text-sm font-semibold text-foreground">
                                    {item.title}
                                </span>
                                {item.summary ? (
                                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
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
    onSelect,
}: {
    chips: string[];
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
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
                >
                    <Search className="size-3 opacity-60" strokeWidth={2} aria-hidden />
                    {chip}
                </button>
            ))}
        </div>
    );
}
