import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {
    CustomizationComparison,
    CUSTOMIZATION_COMPARISON_ID,
} from '@/components/customization/customization-comparison';
import {CustomizationConfigPanel} from '@/components/customization/customization-config-panel';
import {ProductGallery} from '@/components/product/product-gallery';
import {CustomizationReferenceBenefitsSpecs} from '@/components/customization/customization-reference-benefits-specs';
import {
    CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
    hasReferenceOverview,
} from '@/components/customization/customization-reference-overview';
import {
    CUSTOMIZATION_REFERENCE_SPECS_ID,
    hasReferenceSpecs,
} from '@/components/customization/customization-reference-specs';
import {
    CustomizationReferenceWorksWith,
    CUSTOMIZATION_REFERENCE_WORKS_WITH_ID,
    hasReferenceWorksWith,
} from '@/components/customization/customization-reference-works-with';
import {
    CustomizationShowcase,
    CUSTOMIZATION_SHOWCASE_ID,
    hasCustomizationShowcase,
} from '@/components/customization/customization-showcase';
import {AnchorNav, type AnchorNavItem} from '@/components/product/anchor-nav';
import {FaqSection} from '@/components/sections/faq-section';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {StatusBadge} from '@/components/ui/status-badge';
import {formatSectionEyebrow} from '@/components/ui/section-heading';
import {getReferenceCopy} from '@/lib/catalog/reference-copy';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import type {CustomizationDetail, ProductLineRef} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

const CUSTOMIZATION_FAQS_ID = 'customization-faqs';

const glossaryHeroComponents: PortableTextComponents = {
    block: {
        normal: ({children}) => (
            <p className="mb-3 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </p>
        ),
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '#';
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

function pageSectionNavItems(
    pageSections: PageSection[] | null | undefined,
): AnchorNavItem[] {
    if (!pageSections?.length) return [];
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
            const sectionFaqs = 'faqs' in section ? (section.faqs ?? []) : [];
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

type CustomizationDetailViewProps = {
    detail: CustomizationDetail;
    peers?: CustomizationDetail[];
    /** Shared bands from `customizationDetailPage` layout (template → Default). */
    pageSections?: PageSection[] | null;
    /** Compatible products for the Works with browser (PROD-2921). */
    worksWith?: {
        option: WorksWithOptionRef;
        lines: ProductLineRef[];
        products: WorksWithProductCard[];
    };
};

/**
 * Customization detail — hero + page-level section nav (PDP parity).
 */
export function CustomizationDetailView({
    detail,
    peers = [],
    pageSections = null,
    worksWith,
}: CustomizationDetailViewProps) {
    const categoryLabel = detail.categoryLabel || detail.categoryValue;
    const categoryListHref = `${WWW_ROUTES.customizations}?category=${encodeURIComponent(detail.categoryValue)}`;
    const reference = getReferenceCopy(detail.categoryValue, categoryLabel);

    const showOverview = hasReferenceOverview(detail);
    const showSpecs = hasReferenceSpecs(detail);
    const showWorksWith = hasReferenceWorksWith();
    const showShowcase = hasCustomizationShowcase(detail);
    const showFaqs = (detail.faqs?.length ?? 0) > 0;
    const sections = pageSections ?? [];

    const navItems: AnchorNavItem[] = [
        ...(showOverview
            ? [
                  {
                      id: CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
                      label: 'Benefits',
                  },
              ]
            : []),
        ...(showSpecs
            ? [
                  {
                      id: CUSTOMIZATION_REFERENCE_SPECS_ID,
                      label: 'Specs & performance',
                  },
              ]
            : []),
        ...(showWorksWith
            ? [
                  {
                      id: CUSTOMIZATION_REFERENCE_WORKS_WITH_ID,
                      label: 'Works with',
                  },
              ]
            : []),
        {id: CUSTOMIZATION_COMPARISON_ID, label: 'Compare'},
        ...(showShowcase
            ? [{id: CUSTOMIZATION_SHOWCASE_ID, label: 'Showcase'}]
            : []),
        ...(showFaqs ? [{id: CUSTOMIZATION_FAQS_ID, label: 'FAQs'}] : []),
        ...pageSectionNavItems(sections),
    ];

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Customizations', href: WWW_ROUTES.customizations},
                    {
                        label: categoryLabel,
                        href: categoryListHref,
                    },
                    {label: detail.title},
                ]}
            />
            <PageDielineSection
                borderBottom
                paddingBlock="md"
            >
                <article
                    id="customization-overview"
                    className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <ProductGallery
                        media={detail.media}
                        productTitle={detail.title}
                        featuredVideoUrl={detail.featuredVideoUrl}
                    />
                    <div>
                        <div className="flex items-center justify-between gap-4">
                            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.08em] text-brand-blue uppercase">
                                {formatSectionEyebrow(categoryLabel)}
                            </p>
                            <StatusBadge status={detail.status} className="shrink-0" />
                        </div>
                        <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                            {detail.title}
                        </h1>
                        {detail.glossaryDefinition?.length ? (
                            <div className="mt-4 text-base">
                                <PortableText
                                    value={detail.glossaryDefinition}
                                    components={glossaryHeroComponents}
                                />
                            </div>
                        ) : null}
                        <CustomizationConfigPanel detail={detail} />
                    </div>
                </article>
            </PageDielineSection>

            <div className="relative">
                <AnchorNav items={navItems} />

                {showOverview || showSpecs ? (
                    <CustomizationReferenceBenefitsSpecs
                        detail={detail}
                        compareLabel={reference.compareLabel}
                    />
                ) : null}
                {showWorksWith ? (
                    <CustomizationReferenceWorksWith
                        option={
                            worksWith?.option ?? {
                                id: detail.id,
                                category: detail.categoryValue,
                                slug: detail.slug,
                                title: detail.title,
                            }
                        }
                        lines={worksWith?.lines ?? detail.productLines}
                        products={worksWith?.products ?? []}
                    />
                ) : null}

                <CustomizationComparison detail={detail} peers={peers} />
                {showShowcase ? <CustomizationShowcase detail={detail} /> : null}
                {showFaqs ? (
                    <FaqSection
                        sectionId={CUSTOMIZATION_FAQS_ID}
                        items={detail.faqs ?? []}
                        footerHref={WWW_ROUTES.contact}
                        footerLabel="Let's chat"
                    />
                ) : null}
                {sections.length > 0 ? (
                    <SectionRenderer sections={sections} />
                ) : null}
            </div>
        </>
    );
}
