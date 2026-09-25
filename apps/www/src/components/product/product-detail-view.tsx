import {Suspense} from 'react';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageEnter} from '@/components/layout/page-enter';
import {buildProductSpecRows} from '@/components/product/build-product-spec-rows';
import {mapCustomizationPreviewItems} from '@/components/product/map-customization-preview-items';
import {ProductCustomizationsPreview} from '@/components/product/product-customizations-preview';
import {ProductGallery} from '@/components/product/product-gallery';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import {
    AnchorNav,
    type AnchorNavItem,
} from '@/components/product/anchor-nav';
import {ProductSpecs} from '@/components/product/product-specs';
import {FaqSection} from '@/components/sections/faq-section';
import {
    ProductsRow,
    type ProductsRowItem,
} from '@/components/sections/products-row';
import {TestimonialsRow} from '@/components/sections/testimonials-row';
import {listRelatedProductSiblings} from '@/lib/catalog/catalog';
import {displayProductSku} from '@/lib/catalog/display-sku';
import {MOCK_PRODUCT_TESTIMONIALS, MOCK_TESTIMONIALS_AGGREGATE} from '@/lib/catalog/mock-testimonials';
import type {Product} from '@/lib/catalog/types';
import {
    productHref,
    productStyleHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

type ProductDetailViewProps = {
    product: Product;
};

function toProductsRowItem(product: Product): ProductsRowItem {
    const hero = product.media.find((item) => item.src);
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        imageSrc: hero?.src ?? null,
        imageAlt: hero?.alt ?? product.title,
    };
}

function RelatedProductsSkeleton() {
    return (
        <section
            id="pdp-related"
            aria-busy="true"
            aria-live="polite"
            className="scroll-mt-32 bg-muted"
        >
            <PageDielineSection borderBottom innerClassName="py-16 sm:py-20">
                <span className="sr-only">Loading related products</span>
                <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full max-w-xl" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({length: 4}, (_, index) => (
                            <Skeleton
                                key={index}
                                className="aspect-square w-56 shrink-0 rounded-2xl"
                            />
                        ))}
                    </div>
                </div>
            </PageDielineSection>
        </section>
    );
}

async function RelatedProductsFromLine({product}: {product: Product}) {
    const siblings = await listRelatedProductSiblings(product);
    if (siblings.length === 0) return null;
    return (
        <ProductsRow
            theme="muted"
            products={siblings.map(toProductsRowItem)}
        />
    );
}

export function ProductDetailView({product}: ProductDetailViewProps) {
    const {productLine: line, productStyle: style} = product;
    const displaySku = displayProductSku(product.sku, product.slug);
    const specRows = buildProductSpecRows(product);
    const customizationItems = mapCustomizationPreviewItems(
        product.availableCustomizations,
    );
    const curatedRelated = product.relatedProducts ?? [];
    const relatedCards = curatedRelated.map(toProductsRowItem);
    const hasCuratedRelated = relatedCards.length > 0;
    const hasCmsTestimonials = Boolean(product.testimonials?.length);
    const testimonials = hasCmsTestimonials
        ? product.testimonials!
        : MOCK_PRODUCT_TESTIMONIALS;
    const testimonialsAggregate = hasCmsTestimonials
        ? undefined
        : MOCK_TESTIMONIALS_AGGREGATE;
    const faqs = product.faqs ?? [];

    const navItems: AnchorNavItem[] = [
        ...(specRows.length > 0
            ? [{id: 'pdp-specs', label: 'Specifications'}]
            : []),
        ...(customizationItems.length > 0
            ? [{id: 'pdp-customizations', label: 'Customization'}]
            : []),
        // Sibling fallback may still populate related when curated is empty.
        ...(hasCuratedRelated || Boolean(line.slug)
            ? [{id: 'pdp-related', label: 'Related Products'}]
            : []),
        ...(testimonials.length > 0
            ? [{id: 'pdp-testimonials', label: 'Reviews'}]
            : []),
        ...(faqs.length > 0 ? [{id: 'pdp-faqs', label: 'FAQs'}] : []),
    ];

    return (
        <PageEnter>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title, href: productHref(line.slug)},
                    {
                        label: style.title,
                        href: productStyleHref(line.slug, style.slug),
                    },
                    {label: product.title},
                ]}
            />
            <PageDielineSection paddingBlock="sm">
                <article
                    id="pdp-overview"
                    className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <ProductGallery
                        media={product.media}
                        productTitle={product.title}
                        badgeLabel={
                            product.kind === 'inspiration'
                                ? 'Inspiration'
                                : undefined
                        }
                    />
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                            {displaySku}
                        </p>
                        <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                            {product.title}
                        </h1>
                        {product.description ? (
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                                {product.description}
                            </p>
                        ) : null}
                        <ProductRequestRail product={product} />
                    </div>
                </article>
            </PageDielineSection>

            <div className="relative">
                <AnchorNav items={navItems} />
                <ProductSpecs rows={specRows} />
                <ProductCustomizationsPreview
                    styleTitle={style.title}
                    items={customizationItems}
                />
                {hasCuratedRelated ? (
                    <ProductsRow theme="muted" products={relatedCards} />
                ) : (
                    <Suspense fallback={<RelatedProductsSkeleton />}>
                        <RelatedProductsFromLine product={product} />
                    </Suspense>
                )}
                <TestimonialsRow
                    items={testimonials}
                    aggregate={testimonialsAggregate}
                />
                <FaqSection
                    items={faqs}
                    footerHref={WWW_ROUTES.contact}
                    footerLabel="Let's chat"
                />
            </div>
        </PageEnter>
    );
}
