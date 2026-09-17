'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';

import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationQuickView} from '@/components/customization/customization-quick-view';
import type {CustomizationPreviewItem} from '@/components/product/map-customization-preview-items';
import {CatalogCard} from '@/components/ui/catalog-card';
import {CategorySegmentControl} from '@/components/ui/category-segment-control';
import {SectionHeading} from '@/components/ui/section-heading';
import {CUSTOMIZATION_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProductCustomizationsMansoryPreviewProps = {
    styleTitle: string;
    items: CustomizationPreviewItem[];
    /** Product line slug for Browse more → CDP facet filter. */
    productLineSlug?: string;
    heading?: string;
    description?: string;
    className?: string;
    /**
     * Section color band (not app dark/light mode).
     * `muted` = recessed `bg-muted` with elevated white cards.
     */
    theme?: SectionTheme;
};

const CATEGORY_LABELS: Record<string, string> = {
    materials: 'Materials',
    material: 'Materials',
    print: 'Print',
    printing: 'Print',
    finish: 'Finish',
    finishing: 'Finish',
};

const CATEGORY_ORDER = [
    'materials',
    'material',
    'print',
    'printing',
    'finish',
    'finishing',
];

const GRID_LIMIT = 20;
const CTA_LABEL = 'Take a closer look';

function categoryLabel(slug: string, title?: string): string {
    return CATEGORY_LABELS[slug] ?? title ?? slug;
}

function categorySortKey(slug: string): number {
    const index = CATEGORY_ORDER.indexOf(slug);
    return index === -1 ? CATEGORY_ORDER.length : index;
}

/**
 * Materials & finishes — tab grouping + CatalogCard grid.
 * CTA “Take a closer look” opens CustomizationQuickView.
 */
export function ProductCustomizationsMansoryPreview({
    styleTitle,
    items,
    productLineSlug,
    heading,
    description = 'Browse materials, print, and finish options for this style. To add choices to your request, customize in the product overview above.',
    className,
    theme = 'default',
}: ProductCustomizationsMansoryPreviewProps) {
    const shell = sectionThemeShell(theme);

    const categories = useMemo(() => {
        const bySlug = new Map<string, {id: string; label: string}>();
        for (const item of items) {
            if (bySlug.has(item.category)) continue;
            bySlug.set(item.category, {
                id: item.category,
                label: categoryLabel(item.category, item.categoryTitle),
            });
        }
        return [...bySlug.values()].sort(
            (a, b) =>
                categorySortKey(a.id) - categorySortKey(b.id) ||
                a.label.localeCompare(b.label),
        );
    }, [items]);

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeItem, setActiveItem] =
        useState<CustomizationPreviewItem | null>(null);
    const selectedCategory = activeCategory ?? categories[0]?.id ?? null;

    const visibleItems = useMemo(() => {
        if (!selectedCategory) return items;
        return items.filter((item) => item.category === selectedCategory);
    }, [items, selectedCategory]);

    const gridItems = visibleItems.slice(0, GRID_LIMIT);
    const showBrowseMore =
        Boolean(productLineSlug) && visibleItems.length > GRID_LIMIT;
    const browseHref = productLineSlug
        ? `${WWW_ROUTES.customizations}?${CUSTOMIZATION_PRODUCT_LINE_FACET_ID}=${encodeURIComponent(productLineSlug)}`
        : WWW_ROUTES.customizations;

    if (items.length === 0) return null;

    const title = heading ?? `Everything this ${styleTitle} supports`;

    return (
        <section
            id="pdp-customizations"
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <SectionHeading
                    eyebrow="Customization"
                    title={title}
                    description={description}
                    descriptionClassName="text-base leading-6"
                />

                {selectedCategory ? (
                    <div className="mt-8">
                        <CategorySegmentControl
                            theme={theme}
                            items={categories}
                            value={selectedCategory}
                            onValueChange={setActiveCategory}
                            aria-label="Customization categories"
                        />
                    </div>
                ) : null}

                <div className="mt-8">
                    {gridItems.length ? (
                        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {gridItems.map((item, index) => (
                                <li
                                    key={item.href}
                                    className={cn(
                                        'min-w-0',
                                        (index + 1) % 5 === 0 &&
                                            'lg:col-span-2',
                                    )}
                                >
                                    <CatalogCard
                                        href={item.href}
                                        title={item.label}
                                        align="left"
                                        size="sm"
                                        surface={shell.cardSurface}
                                        ctaLabel={CTA_LABEL}
                                        eyebrow={
                                            item.typeTitle ?? item.categoryTitle
                                        }
                                        imageSrc={item.imageUrl}
                                        imageAlt={
                                            item.imageAlt ?? item.label
                                        }
                                        onCtaClick={() => setActiveItem(item)}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="py-8 text-sm text-muted-foreground">
                            No customizations in this category yet.
                        </p>
                    )}

                    {showBrowseMore ? (
                        <div className="mt-8 flex justify-center">
                            <Button variant="link" asChild>
                                <Link href={browseHref}>
                                    Browse more customizations
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </PageDielineSection>

            <CustomizationQuickView
                item={activeItem}
                open={activeItem != null}
                onOpenChange={(next) => {
                    if (!next) setActiveItem(null);
                }}
            />
        </section>
    );
}
