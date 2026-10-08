'use client';

import {useMemo, useState} from 'react';
import {ChevronDown} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {ProductCapabilityCard} from '@/components/product/product-capability-card';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import {compatibilityProductHref} from '@/lib/catalog/compatibility-product-href';
import type {ProductLineRef} from '@/lib/catalog/types';
import {useRequest} from '@/lib/request/request-provider';
import {useProgressiveReveal} from '@/lib/catalog/use-progressive-reveal';

const PAGE_SIZE = 8;

type CustomizationWorksWithBrowserProps = {
    option: WorksWithOptionRef;
    lines: ProductLineRef[];
    products: WorksWithProductCard[];
};

function productSupportsOption(
    available:
        | {id?: string; slug?: string; category?: string}[]
        | undefined,
    option: WorksWithOptionRef,
): boolean {
    if (!available?.length) return false;
    return available.some((opt) => {
        if (opt.id && opt.id === option.id) return true;
        const slug = (opt.slug ?? '').toLowerCase();
        const category = (opt.category ?? '').toLowerCase();
        return (
            slug === option.slug.toLowerCase() &&
            category === option.category.toLowerCase()
        );
    });
}

/**
 * Works with browse shell — product lines + compatible products; draft-request
 * products pin first in their line with ProductCapabilityCard inRequest (PROD-2921).
 * Engine “Show more” lives on the parent SectionHeading CTA.
 */
export function CustomizationWorksWithBrowser({
    option,
    lines,
    products,
}: CustomizationWorksWithBrowserProps) {
    const {lines: requestLines} = useRequest();

    const inRequestSlugs = useMemo(() => {
        const slugs = new Set<string>();
        for (const line of requestLines) {
            if (!productSupportsOption(line.availableCustomizations, option)) {
                continue;
            }
            if (line.productSlug) slugs.add(line.productSlug);
        }
        return slugs;
    }, [requestLines, option]);

    const [activeLine, setActiveLine] = useState<string | null>(null);
    const selectedLine =
        activeLine && lines.some((line) => line.slug === activeLine)
            ? activeLine
            : (lines[0]?.slug ?? null);

    const gridProducts = useMemo(() => {
        if (!selectedLine) return [];
        const inLine = products.filter(
            (p) => p.productLineSlug === selectedLine,
        );
        return [...inLine].sort((a, b) => {
            const aIn = inRequestSlugs.has(a.slug) ? 0 : 1;
            const bIn = inRequestSlugs.has(b.slug) ? 0 : 1;
            if (aIn !== bIn) return aIn - bIn;
            return a.title.localeCompare(b.title);
        });
    }, [selectedLine, products, inRequestSlugs]);

    const {visible, showLoadMore, revealNextBatch} = useProgressiveReveal({
        total: gridProducts.length,
        pageSize: PAGE_SIZE,
        autoRevealLimit: 0,
        resetKey: selectedLine ?? '',
    });

    const revealed = gridProducts.slice(0, visible);

    if (lines.length === 0) {
        return (
            <div className="mt-8">
                <p className="text-sm text-muted-foreground">
                    Product-line availability for this option has not been
                    authored yet.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="rounded-3xl bg-muted p-6 sm:p-8 md:p-0">
                <div className="grid items-start gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
                    <nav
                        aria-label="Product lines"
                        className="flex flex-wrap gap-2 md:hidden"
                    >
                        {lines.map((line) => (
                            <RailPill
                                key={line.slug}
                                label={line.title}
                                selected={selectedLine === line.slug}
                                onSelect={() => setActiveLine(line.slug)}
                                mobile
                            />
                        ))}
                    </nav>
                    <nav
                        aria-label="Product lines"
                        className="hidden flex-col gap-1 md:sticky md:top-24 md:flex md:self-start md:py-8 md:pl-8 md:pr-6 lg:py-10 lg:pl-10"
                    >
                        {lines.map((line) => (
                            <RailPill
                                key={line.slug}
                                label={line.title}
                                selected={selectedLine === line.slug}
                                onSelect={() => setActiveLine(line.slug)}
                            />
                        ))}
                    </nav>

                    <div className="min-w-0 md:flex">
                        <div className="min-w-0 flex-1 md:py-8 md:pl-10 md:pr-4 lg:py-10 lg:pr-5">
                            {revealed.length ? (
                                <>
                                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {revealed.map((item) => {
                                            const href =
                                                compatibilityProductHref(
                                                    item.slug,
                                                    option,
                                                );
                                            const inRequest =
                                                inRequestSlugs.has(item.slug);
                                            return (
                                                <li
                                                    key={item.id}
                                                    className="min-h-0 h-full"
                                                >
                                                    <ProductCapabilityCard
                                                        data={{
                                                            title: item.title,
                                                            href,
                                                            sku: item.sku,
                                                            imageUrl:
                                                                item.imageUrl,
                                                            imageAlt:
                                                                item.imageAlt ??
                                                                item.title,
                                                        }}
                                                        inRequest={inRequest}
                                                        applyWatermark={false}
                                                        surface="elevated"
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {showLoadMore ? (
                                        <div className="mt-8 flex justify-center md:mt-10">
                                            <Button
                                                type="button"
                                                variant="link"
                                                onClick={revealNextBatch}
                                                className="gap-1 text-primary"
                                            >
                                                Show more
                                                <ChevronDown
                                                    className="size-4"
                                                    aria-hidden
                                                />
                                            </Button>
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <p className="py-8 text-sm text-muted-foreground">
                                    No products in this line support this
                                    customization yet.
                                </p>
                            )}
                        </div>
                        <div
                            aria-hidden
                            className="hidden md:block md:w-4 md:shrink-0 lg:w-5"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function RailPill({
    label,
    selected,
    onSelect,
    mobile = false,
}: {
    label: string;
    selected: boolean;
    onSelect: () => void;
    mobile?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            aria-current={selected ? 'true' : undefined}
            className={cn(
                'h-auto cursor-pointer justify-start rounded-md px-3 py-2 text-sm font-medium shadow-none',
                selected
                    ? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                mobile && 'rounded-full px-4 py-2 text-xs',
            )}
            onClick={onSelect}
        >
            {label}
        </Button>
    );
}
