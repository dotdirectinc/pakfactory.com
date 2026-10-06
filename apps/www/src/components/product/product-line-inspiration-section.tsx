'use client';

import {useMemo, useState} from 'react';
import {ChevronDown} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    SolutionProductPreview,
    type SolutionHeroPreviewProduct,
} from '@/components/solution/solution-product-preview';
import {CustomizationCatalogCard} from '@/components/ui/customization-catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import {
    filterInspirationProductsByIndustry,
    resolveInspirationIndustries,
    type ProductLineInspirationIndustry,
} from '@/lib/catalog/product-line-landing';
import {customizationOptionHref} from '@/lib/catalog/customization-option-href';
import type {Product} from '@/lib/catalog/types';
import {useProgressiveReveal} from '@/lib/catalog/use-progressive-reveal';
import type {SolutionHeroCustomization} from '@/lib/solutions/types';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

/** Initial / batch size — 2 rows × 4 cols at lg. */
const PAGE_SIZE = 8;

export type ProductLineInspirationSectionProps = {
    lineTitle: string;
    products: Product[];
    /** CMS eyebrow; default Inspiration. */
    eyebrow?: string;
    heading?: string;
    description?: string;
    /** CMS curated industries (Studio order). Empty → all with products. */
    curatedIndustries?: ProductLineInspirationIndustry[] | null;
    borderTop?: boolean;
    borderBottom?: boolean;
    className?: string;
};

function mapPreviewCustomizations(
    product: Product,
): SolutionHeroCustomization[] {
    const all = product.availableCustomizations ?? [];
    const preselected = all.filter((opt) => opt.preselected);
    const options = (preselected.length > 0 ? preselected : all).slice(0, 4);
    return options.map((opt) => {
        const learnMoreHref =
            customizationOptionHref(opt) ?? WWW_ROUTES.customizations;
        const imageSrc = opt.imageUrl?.trim() || null;
        return {
            id: opt.id || opt.slug || opt.label,
            category: (
                opt.categoryTitle ||
                opt.category ||
                'CUSTOMIZATION'
            ).toUpperCase(),
            title: opt.label,
            description:
                opt.shortDescription?.trim() ||
                'Pre-selected on this inspiration product.',
            learnMoreHref,
            ...(imageSrc
                ? {imageSrc, imageAlt: opt.label}
                : {imageSrc: null}),
        };
    });
}

function toPreviewProduct(product: Product): SolutionHeroPreviewProduct {
    const media = product.media?.find((m) => Boolean(m.src?.trim()));
    const modelSrc = product.model3dUrl?.trim() || '';
    const modelAnimationName = product.model3dAnimationName?.trim() || '';
    return {
        id: product.slug,
        title: product.title,
        detailHref: productHref(product.slug),
        ...(media?.src?.trim()
            ? {
                  image: {
                      src: media.src.trim(),
                      alt: media.alt?.trim() || product.title,
                  },
              }
            : {}),
        ...(modelSrc ? {modelSrc} : {}),
        ...(modelAnimationName ? {modelAnimationName} : {}),
        customizations: mapPreviewCustomizations(product),
    };
}

/**
 * Product-line Inspiration band — industry left rail + inspiration product cards
 * for the current line (CMS `inspirationIndustry` via host override).
 */
export function ProductLineInspirationSection({
    lineTitle,
    products,
    eyebrow = 'Inspiration',
    heading,
    description = 'Browse inspiration products by industry for this line. Open a card for a closer look, or visit the product page for full details.',
    curatedIndustries,
    borderTop = false,
    borderBottom = true,
    className,
}: ProductLineInspirationSectionProps) {
    const industries = useMemo(
        () => resolveInspirationIndustries(products, curatedIndustries),
        [products, curatedIndustries],
    );

    const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
    const [preview, setPreview] = useState<SolutionHeroPreviewProduct | null>(
        null,
    );
    const selectedIndustry = activeIndustry ?? industries[0]?.slug ?? null;

    const industryProducts = useMemo(() => {
        if (!selectedIndustry) return products;
        return filterInspirationProductsByIndustry(products, selectedIndustry);
    }, [products, selectedIndustry]);

    const {visible, showLoadMore, revealNextBatch} = useProgressiveReveal({
        total: industryProducts.length,
        pageSize: PAGE_SIZE,
        autoRevealLimit: 0,
        resetKey: selectedIndustry ?? '',
    });

    const revealedItems = industryProducts.slice(0, visible);

    if (products.length === 0 || industries.length === 0) return null;

    const title = heading?.trim() || `Inspiration for ${lineTitle}`;

    return (
        <section
            id="product-line-inspiration"
            className={cn('scroll-mt-20', className)}
        >
            <PageDielineSection
                borderTop={borderTop}
                borderBottom={borderBottom}
                innerClassName="py-16 sm:py-20"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={title}
                    description={description}
                />

                <div className="mt-8 rounded-3xl bg-muted p-6 sm:mt-10 sm:p-8 md:p-0">
                    <div className="grid items-start gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
                        <nav
                            aria-label="Industries"
                            className="flex flex-wrap gap-2 md:hidden"
                        >
                            {industries.map((industry) => (
                                <IndustryPill
                                    key={industry.slug}
                                    label={industry.title}
                                    selected={
                                        selectedIndustry === industry.slug
                                    }
                                    onSelect={() =>
                                        setActiveIndustry(industry.slug)
                                    }
                                    mobile
                                />
                            ))}
                        </nav>
                        <nav
                            aria-label="Industries"
                            className="hidden flex-col gap-1 md:sticky md:top-24 md:flex md:self-start md:py-8 md:pl-8 md:pr-6 lg:py-10 lg:pl-10"
                        >
                            {industries.map((industry) => (
                                <IndustryPill
                                    key={industry.slug}
                                    label={industry.title}
                                    selected={
                                        selectedIndustry === industry.slug
                                    }
                                    onSelect={() =>
                                        setActiveIndustry(industry.slug)
                                    }
                                />
                            ))}
                        </nav>

                        <div className="min-w-0 md:flex">
                            <div className="min-w-0 flex-1 md:py-8 md:pl-10 md:pr-4 lg:py-10 lg:pr-5">
                                {revealedItems.length ? (
                                    <>
                                        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            {revealedItems.map((item) => {
                                                const media = item.media?.find(
                                                    (m) =>
                                                        Boolean(m.src?.trim()),
                                                );
                                                return (
                                                    <li key={item.slug}>
                                                        <CustomizationCatalogCard
                                                            href={productHref(
                                                                item.slug,
                                                            )}
                                                            title={item.title}
                                                            eyebrow={
                                                                item
                                                                    .productStyle
                                                                    ?.title ??
                                                                'Inspiration'
                                                            }
                                                            imageSrc={
                                                                media?.src
                                                            }
                                                            imageAlt={
                                                                media?.alt ??
                                                                item.title
                                                            }
                                                            surface="elevated"
                                                            onCloserLook={() =>
                                                                setPreview(
                                                                    toPreviewProduct(
                                                                        item,
                                                                    ),
                                                                )
                                                            }
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
                                        No inspiration products in this industry
                                        yet.
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
            </PageDielineSection>

            <SolutionProductPreview
                product={preview}
                open={preview != null}
                onOpenChange={(next) => {
                    if (!next) setPreview(null);
                }}
            />
        </section>
    );
}

function IndustryPill({
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
