import {Badge} from '@pakfactory/ui/components/badge';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {buildProductSpecRows} from '@/components/product/build-product-spec-rows';
import {mapCustomizationPreviewItems} from '@/components/product/map-customization-preview-items';
import {ProductCustomizationsMansoryPreview} from '@/components/product/product-customizations-mansory-preview';
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

export function ProductDetailView({product}: ProductDetailViewProps) {
    const {productLine: line, productStyle: style} = product;
    const specRows = buildProductSpecRows(product);
    const customizationItems = mapCustomizationPreviewItems(
        product.availableCustomizations,
    );
    const relatedCards = (product.relatedProducts ?? []).map(toProductsRowItem);
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
        ...(relatedCards.length > 0
            ? [{id: 'pdp-related', label: 'Related Products'}]
            : []),
        ...(testimonials.length > 0
            ? [{id: 'pdp-testimonials', label: 'Reviews'}]
            : []),
        ...(faqs.length > 0 ? [{id: 'pdp-faqs', label: 'FAQs'}] : []),
    ];

    return (
        <>
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
            <PageDielineSection innerClassName="border-b border-dashed border-border">
                <article
                    id="pdp-overview"
                    className="scroll-mt-32 grid gap-10 py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <ProductGallery
                        media={product.media}
                        productTitle={product.title}
                    />
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                {product.sku}
                            </p>
                            {product.kind === 'inspiration' ? (
                                <Badge variant="secondary">Inspiration</Badge>
                            ) : null}
                        </div>
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
                <ProductCustomizationsMansoryPreview
                    theme="muted"
                    styleTitle={style.title}
                    items={customizationItems}
                    productLineSlug={line.slug}
                />
                <ProductsRow theme="muted" products={relatedCards} />
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
        </>
    );
}
