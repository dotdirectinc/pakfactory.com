import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {buildProductSpecRows} from '@/components/product/build-product-spec-rows';
import {mapCustomizationPreviewItems} from '@/components/product/map-customization-preview-items';
import {ProductCustomizationsPreview} from '@/components/product/product-customizations-preview';
import {ProductGallery} from '@/components/product/product-gallery';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import {StatusBadge, StatusNotice} from '@/components/ui/status-badge';
import {
    AnchorNav,
    type AnchorNavItem,
} from '@/components/product/anchor-nav';
import {ProductSpecs} from '@/components/product/product-specs';
import {SectionRenderer} from '@/components/sections/section-renderer';
import {listRelatedProductSiblings} from '@/lib/catalog/catalog';
import {displayProductSku} from '@/lib/catalog/display-sku';
import {
    buildProductDetailBreadcrumbs,
    buildProductDetailJsonLd,
} from '@/lib/catalog/product-jsonld';
import type {Product} from '@/lib/catalog/types';
import {mergeSolutionSections} from '@/lib/sections/merge-solution-sections';
import {
    applySectionTokens,
    sectionTokenContextFromHost,
} from '@/lib/sections/resolve-section-tokens';
import {WWW_ROUTES} from '@/lib/www-routes';
import type {PageSectionProductsRowItemDoc} from '@pakfactory/sanity/queries';

type ProductDetailViewProps = {
    product: Product;
};

function toProductsRowInheritItem(
    product: Product,
): PageSectionProductsRowItemDoc {
    const hero = product.media.find((item) => item.src);
    return {
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        imageSrc: hero?.src ?? null,
        imageAlt: hero?.alt ?? product.title,
    };
}

export async function ProductDetailView({product}: ProductDetailViewProps) {
    const {productStyle: style} = product;
    const displaySku = displayProductSku(product.sku, product.slug);
    const specRows = buildProductSpecRows(product);
    const customizationItems = mapCustomizationPreviewItems(
        product.availableCustomizations,
    );
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
        ...(specRows.length > 0
            ? [{id: 'pdp-specs', label: 'Specifications'}]
            : []),
        ...(customizationItems.length > 0
            ? [{id: 'pdp-customizations', label: 'Customization'}]
            : []),
        ...pageSections.flatMap((section): AnchorNavItem[] => {
            if (section._type === 'productsRow') {
                const items =
                    'items' in section ? (section.items ?? []) : [];
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
        }),
    ];

    const breadcrumbItems = buildProductDetailBreadcrumbs(product);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: buildProductDetailJsonLd(product),
                }}
            />
            <PageBreadcrumbSection items={breadcrumbItems} />
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
                        <div className="flex items-center justify-between gap-4">
                            <p className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                {displaySku}
                            </p>
                            <StatusBadge status={product.status} className="shrink-0" />
                        </div>
                        <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                            {product.title}
                        </h1>
                        {product.description ? (
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                                {product.description}
                            </p>
                        ) : null}
                        {/* Coming soon / discontinued: shown, never orderable (PROD-2605). */}
                        {product.status && product.status !== 'active' ? (
                            <StatusNotice
                                status={product.status}
                                contactHref={WWW_ROUTES.contact}
                            />
                        ) : (
                            <ProductRequestRail product={product} />
                        )}
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
                {pageSections.length > 0 ? (
                    <SectionRenderer sections={pageSections} />
                ) : null}
            </div>
        </>
    );
}
