import {Badge} from '@pakfactory/ui/components/badge';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {buildProductSpecRows} from '@/components/product/build-product-spec-rows';
import {mapCustomizationPreviewItems} from '@/components/product/map-customization-preview-items';
import {ProductCustomizationsPreview} from '@/components/product/product-customizations-preview';
import {ProductGallery} from '@/components/product/product-gallery';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import {ProductSpecs} from '@/components/product/product-specs';
import type {ProductCardData} from '@/components/product/product-card';
import {FaqSection} from '@/components/sections/faq-section';
import {ProductsRow} from '@/components/sections/products-row';
import {QuoteCta} from '@/components/sections/quote-cta';
import {TestimonialsRow} from '@/components/sections/testimonials-row';
import type {Product} from '@/lib/catalog/types';
import {
    productHref,
    productStyleHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

type ProductDetailViewProps = {
    product: Product;
};

function toProductCardData(product: Product): ProductCardData {
    const hero = product.media.find((item) => item.src);
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        imageUrl: hero?.src ?? null,
        imageAlt: hero?.alt ?? product.title,
        images: product.media
            .filter((item): item is {src: string; alt: string} =>
                Boolean(item.src),
            )
            .map((item) => ({src: item.src, alt: item.alt})),
        moq: product.moq,
        leadTime:
            typeof product.leadTimeDays === 'number'
                ? product.leadTimeDays === 1
                    ? '1 day'
                    : `${product.leadTimeDays} days`
                : undefined,
    };
}

export function ProductDetailView({product}: ProductDetailViewProps) {
    const {productLine: line, productStyle: style} = product;
    const specRows = buildProductSpecRows(product);
    const customizationItems = mapCustomizationPreviewItems(
        product.availableCustomizations,
    );
    const relatedCards = (product.relatedProducts ?? []).map(toProductCardData);
    const testimonials = product.testimonials ?? [];
    const faqs = product.faqs ?? [];

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
                    className="scroll-mt-20 grid gap-10 py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
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
                        {style ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                <span className="font-semibold text-brand-blue">
                                    Style:{' '}
                                </span>
                                {style.title}
                            </p>
                        ) : null}
                        <ProductRequestRail product={product} />
                    </div>
                </article>
            </PageDielineSection>

            <ProductSpecs rows={specRows} />
            <ProductCustomizationsPreview
                styleTitle={style.title}
                items={customizationItems}
            />
            <ProductsRow
                heading="You might also like"
                products={relatedCards}
            />
            <TestimonialsRow items={testimonials} />
            <FaqSection
                items={faqs}
                footerHref={WWW_ROUTES.contact}
                footerLabel="Talk to a specialist"
            />
            <QuoteCta href={WWW_ROUTES.request} />
        </>
    );
}
