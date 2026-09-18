'use client';

import {useMemo, useState} from 'react';

import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import type {CustomizationPreviewItem} from '@/components/product/map-customization-preview-items';
import {CustomizationQuickView} from '@/components/customization/customization-quick-view';
import {CustomizationCatalogCard} from '@/components/ui/customization-catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';

type ProductCustomizationsPreviewProps = {
    styleTitle: string;
    items: CustomizationPreviewItem[];
    heading?: string;
    description?: string;
    className?: string;
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

function categoryLabel(slug: string, title?: string): string {
    return CATEGORY_LABELS[slug] ?? title ?? slug;
}

function categorySortKey(slug: string): number {
    const index = CATEGORY_ORDER.indexOf(slug);
    return index === -1 ? CATEGORY_ORDER.length : index;
}

/**
 * Materials & finishes browse grid (PROD-1913 / POC V2).
 * CDP-linked cards; configure in the product overview above.
 */
export function ProductCustomizationsPreview({
    styleTitle,
    items,
    heading,
    description = 'Browse materials, print, and finish options for this style. To add choices to your request, customize in the product overview above.',
    className,
}: ProductCustomizationsPreviewProps) {
    const categories = useMemo(() => {
        const bySlug = new Map<string, {slug: string; label: string}>();
        for (const item of items) {
            if (bySlug.has(item.category)) continue;
            bySlug.set(item.category, {
                slug: item.category,
                label: categoryLabel(item.category, item.categoryTitle),
            });
        }
        return [...bySlug.values()].sort(
            (a, b) =>
                categorySortKey(a.slug) - categorySortKey(b.slug) ||
                a.label.localeCompare(b.label),
        );
    }, [items]);

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeItem, setActiveItem] =
        useState<CustomizationPreviewItem | null>(null);
    const selectedCategory = activeCategory ?? categories[0]?.slug ?? null;

    const visibleItems = useMemo(() => {
        if (!selectedCategory) return items;
        return items.filter((item) => item.category === selectedCategory);
    }, [items, selectedCategory]);

    if (items.length === 0) return null;

    const title =
        heading ?? `Everything this ${styleTitle} supports`;

    return (
        <section id="pdp-customizations" className={cn('scroll-mt-20', className)}>
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <SectionHeading
                    eyebrow="Customization"
                    title={title}
                    description={description}
                    descriptionClassName="text-base leading-6"
                />

                <div
                    className={cn(
                        'mt-8 max-h-[min(40rem,70vh)] overflow-y-auto overscroll-contain',
                        'rounded-3xl bg-muted p-6 sm:mt-10 sm:p-8 lg:p-10',
                    )}
                >
                    <div className="grid items-start gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-0 lg:grid-cols-[12rem_minmax(0,1fr)]">
                        <nav
                            aria-label="Customization categories"
                            className="flex flex-wrap gap-2 md:hidden"
                        >
                            {categories.map((cat) => (
                                <CategoryPill
                                    key={cat.slug}
                                    label={cat.label}
                                    selected={selectedCategory === cat.slug}
                                    onSelect={() => setActiveCategory(cat.slug)}
                                    mobile
                                />
                            ))}
                        </nav>
                        <nav
                            aria-label="Customization categories"
                            className="hidden flex-col gap-1 md:sticky md:top-0 md:flex md:self-start md:pr-6"
                        >
                            {categories.map((cat) => (
                                <CategoryPill
                                    key={cat.slug}
                                    label={cat.label}
                                    selected={selectedCategory === cat.slug}
                                    onSelect={() => setActiveCategory(cat.slug)}
                                />
                            ))}
                        </nav>

                        <div className="min-w-0 md:pl-10">
                            {visibleItems.length ? (
                                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {visibleItems.map((item) => (
                                        <li key={item.href}>
                                            <CustomizationCatalogCard
                                                href={item.href}
                                                title={item.label}
                                                eyebrow={
                                                    item.typeTitle ??
                                                    item.categoryTitle
                                                }
                                                imageSrc={item.imageUrl}
                                                imageAlt={
                                                    item.imageAlt ?? item.label
                                                }
                                                surface="elevated"
                                                onCloserLook={() =>
                                                    setActiveItem(item)
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="py-8 text-sm text-muted-foreground">
                                    No customizations in this category yet.
                                </p>
                            )}
                        </div>
                    </div>
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

function CategoryPill({
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
