import {Suspense, type ComponentType} from 'react';
import type {
    PageSectionDoc,
    PageSectionProductsRowItemDoc,
    PageSectionTestimonialsRowDoc,
} from '@pakfactory/sanity/queries';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {buildProductSpecRows} from '@/components/product/build-product-spec-rows';
import {mapCustomizationPreviewItems} from '@/components/product/map-customization-preview-items';
import {ProductCustomizationsPreview} from '@/components/product/product-customizations-preview';
import {ProductPdpShell} from '@/components/product/product-pdp-shell';
import {
    AnchorNav,
    type AnchorNavItem,
} from '@/components/product/anchor-nav';
import {ProductSpecs} from '@/components/product/product-specs';
import {SectionRenderer} from '@/components/sections/section-renderer';
import {TestimonialsRow} from '@/components/sections/testimonials-row';
import {listRelatedProductSiblings} from '@/lib/catalog/catalog';
import {pickCardHoverStill} from '@/lib/catalog/card-hover-still';
import {displayProductSku} from '@/lib/catalog/display-sku';
import {primaryProductStill} from '@/lib/catalog/map-sanity';
import {
    buildProductDetailBreadcrumbs,
    buildProductDetailJsonLd,
} from '@/lib/catalog/product-jsonld';
import type {Product} from '@/lib/catalog/types';
import {PRODUCT_DETAIL_COPY} from '@/lib/copy/product-detail';
import {getGooglePlaceReviews} from '@/lib/places/reviews';
import {mergeSolutionSections} from '@/lib/sections/merge-solution-sections';
import {mapTestimonialsRow} from '@/lib/sections/map-testimonials-row';
import {
    applySectionTokens,
    sectionTokenContextFromHost,
} from '@/lib/sections/resolve-section-tokens';

/**
 * PDP-only testimonials — same Places data as the registry, but the aggregate
 * label is “Google rating” (locked PDP-copy.md). Home keeps “Customer Reviews”.
 */
async function PdpTestimonialsRow(section: PageSectionDoc) {
    const mapped = mapTestimonialsRow(
        section as PageSectionTestimonialsRowDoc,
    );
    const reviews = await getGooglePlaceReviews();
    if (!reviews || reviews.items.length === 0) return null;

    const aggregate = reviews.aggregate
        ? {
              ...reviews.aggregate,
              label: PRODUCT_DETAIL_COPY.googleRatingLabel,
          }
        : undefined;

    return (
        <TestimonialsRow
            sectionId={`section-reviews-${section._key}`}
            items={reviews.items}
            aggregate={aggregate}
            reviewsProfileUrl={reviews.reviewsProfileUrl}
            title={mapped.heading}
            description={mapped.intro}
            eyebrow={mapped.eyebrow}
            align={mapped.align}
            borderTop={mapped.borderTop}
            borderBottom={mapped.borderBottom}
            paddingBlock={mapped.paddingBlock}
            cta={mapped.cta}
            layoutVariant={mapped.layoutVariant}
            aggregatePlacement={mapped.aggregatePlacement}
        />
    );
}

type ProductDetailViewProps = {
    product: Product;
};

function toProductsRowInheritItem(
    product: Product,
): PageSectionProductsRowItemDoc {
    const hero = primaryProductStill(product.media);
    const hover = pickCardHoverStill(hero?.src, product.hoverImage);
    return {
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        imageSrc: hero?.src ?? null,
        imageAlt: hero?.alt ?? product.title,
        ...(hover
            ? {
                  hoverImageSrc: hover.src,
                  hoverImageAlt: hover.alt ?? product.title,
              }
            : {}),
    };
}

function buildStaticNavItems(
    specRowsLength: number,
    customizationItemsLength: number,
): AnchorNavItem[] {
    return [
        ...(specRowsLength > 0
            ? [{id: 'pdp-specs', label: 'Specifications'}]
            : []),
        ...(customizationItemsLength > 0
            ? [{id: 'pdp-customizations', label: 'Customization'}]
            : []),
    ];
}

function navItemsFromSections(pageSections: PageSectionDoc[]): AnchorNavItem[] {
    return pageSections.flatMap((section): AnchorNavItem[] => {
        if (section._type === 'productsRow') {
            const items = 'items' in section ? (section.items ?? []) : [];
            if (items.length === 0) return [];
            return [
                {
                    id: `section-products-${section._key}`,
                    label: 'Related Products',
                },
            ];
        }
        if (section._type === 'testimonialsRow') {
            return [
                {
                    id: `section-reviews-${section._key}`,
                    label: 'Reviews',
                },
            ];
        }
        if (section._type === 'faqSection') {
            const sectionFaqs =
                'faqs' in section ? (section.faqs ?? []) : [];
            if (sectionFaqs.length === 0) return [];
            return [
                {
                    id: `section-faqs-${section._key}`,
                    label: 'FAQs',
                },
            ];
        }
        return [];
    });
}

/**
 * Specs / customizations / sections — awaits related siblings for productsRow
 * inherit (PROD-3102). Suspended so gallery chrome in {@link ProductPdpShell}
 * can stream first.
 */
async function ProductDetailBelowFold({
    product,
    specRows,
    customizationItems,
}: {
    product: Product;
    specRows: ReturnType<typeof buildProductSpecRows>;
    customizationItems: ReturnType<typeof mapCustomizationPreviewItems>;
}) {
    const {productStyle: style} = product;
    const faqs = product.faqs ?? [];

    // Related strip inherit: curated on product, else same-line siblings (PROD-1913).
    const relatedForInherit = (
        await listRelatedProductSiblings(product)
    ).map(toProductsRowInheritItem);

    const contentSections = product.sections ?? [];
    const templateSections = product.templateSections ?? [];
    const documentFaqs = faqs.map((faq) => ({
        question: faq.question,
        answerPlain: faq.answerPlain,
        ...(faq.answer?.length ? {answer: faq.answer} : {}),
    }));
    const mergedSections =
        templateSections.length > 0
            ? mergeSolutionSections(
                  templateSections,
                  contentSections,
                  undefined,
                  documentFaqs,
                  undefined,
                  undefined,
                  relatedForInherit,
              )
            : contentSections;
    const pageSections = applySectionTokens(
        mergedSections,
        sectionTokenContextFromHost({
            title: product.title,
            h1: product.title,
            shortName: product.title,
            shortDescription: product.description,
            descriptionText: product.description,
            slug: product.slug,
        }),
    );

    const navItems: AnchorNavItem[] = [
        ...buildStaticNavItems(specRows.length, customizationItems.length),
        ...navItemsFromSections(pageSections),
    ];

    return (
        <>
            <AnchorNav items={navItems} />
            <ProductSpecs rows={specRows} />
            <ProductCustomizationsPreview
                styleTitle={style.title}
                items={customizationItems}
            />
            {pageSections.length > 0 ? (
                <SectionRenderer
                    sections={pageSections}
                    components={{
                        testimonialsRow:
                            PdpTestimonialsRow as ComponentType<PageSectionDoc>,
                    }}
                />
            ) : null}
        </>
    );
}

export async function ProductDetailView({product}: ProductDetailViewProps) {
    const displaySku = displayProductSku(product.sku, product.slug);
    const specRows = buildProductSpecRows(product);
    const customizationItems = mapCustomizationPreviewItems(
        product.availableCustomizations,
    );
    const breadcrumbItems = buildProductDetailBreadcrumbs(product);
    const fallbackNav = buildStaticNavItems(
        specRows.length,
        customizationItems.length,
    );

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: buildProductDetailJsonLd(product),
                }}
            />
            <PageBreadcrumbSection items={breadcrumbItems} />
            <ProductPdpShell product={product} displaySku={displaySku}>
                <div className="relative">
                    <Suspense
                        fallback={
                            <>
                                <AnchorNav items={fallbackNav} />
                                <ProductSpecs rows={specRows} />
                                <ProductCustomizationsPreview
                                    styleTitle={product.productStyle.title}
                                    items={customizationItems}
                                />
                            </>
                        }
                    >
                        <ProductDetailBelowFold
                            product={product}
                            specRows={specRows}
                            customizationItems={customizationItems}
                        />
                    </Suspense>
                </div>
            </ProductPdpShell>
        </>
    );
}
