import {Suspense} from 'react';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {
    CustomizationComparison,
    CUSTOMIZATION_COMPARISON_ID,
} from '@/components/customization/customization-comparison';
import {CustomizationDetailHostProvider} from '@/components/customization/customization-detail-host';
import {CustomizationOverviewStandard} from '@/components/customization/customization-overview-standard';
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
import {
    getLearnFirstSectionCopy,
    getReferenceCopy,
} from '@/lib/catalog/reference-copy';
import {buildWorksWithProducts} from '@/lib/catalog/build-works-with-products';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import {
    getCustomizationDetailPage,
    listProductLibrary,
    listProductOfferIndex,
} from '@/lib/catalog/catalog';
import type {CustomizationDetail, ProductLineRef} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

const CUSTOMIZATION_FAQS_ID = 'customization-faqs';

const CDP_SECTION_TYPES = new Set([
    'customizationOverviewStandard',
    'customizationOverviewLearnFirst',
    'customizationBenefitsSpecs',
    'customizationWorksWith',
    'customizationCompare',
    'customizationShowcase',
]);

const OVERVIEW_SECTION_TYPES = new Set([
    'customizationOverviewStandard',
    'customizationOverviewLearnFirst',
]);

function pageSectionNavItems(
    pageSections: PageSection[] | null | undefined,
    detail: CustomizationDetail,
    isLearnFirstTemplate: boolean,
): AnchorNavItem[] {
    if (!pageSections?.length) return [];
    const learnCopy = isLearnFirstTemplate
        ? getLearnFirstSectionCopy(detail)
        : null;

    return pageSections.flatMap((section): AnchorNavItem[] => {
        switch (section._type) {
            case 'customizationWorksWith':
                return [
                    {
                        id: CUSTOMIZATION_REFERENCE_WORKS_WITH_ID,
                        label:
                            section.heading?.trim() ||
                            learnCopy?.worksWith.navLabel ||
                            'Works with',
                    },
                ];
            case 'customizationCompare':
                return [
                    {
                        id: CUSTOMIZATION_COMPARISON_ID,
                        label:
                            section.heading?.trim() ||
                            learnCopy?.compare.navLabel ||
                            'Compare',
                    },
                ];
            case 'customizationShowcase':
                return [
                    {
                        id: CUSTOMIZATION_SHOWCASE_ID,
                        label:
                            section.heading?.trim() ||
                            learnCopy?.showcase.navLabel ||
                            'Showcase',
                    },
                ];
            case 'customizationBenefitsSpecs':
                return [
                    {
                        id: CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
                        label: section.heading?.trim() || 'Benefits',
                    },
                ];
            case 'productsRow': {
                const items = 'items' in section ? (section.items ?? []) : [];
                if (items.length === 0) return [];
                return [
                    {
                        id: `section-products-${section._key}`,
                        label: 'Related Products',
                    },
                ];
            }
            case 'testimonialsRow':
                return [
                    {
                        id: `section-reviews-${section._key}`,
                        label: 'Reviews',
                    },
                ];
            case 'faqSection': {
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
            default:
                return [];
        }
    });
}

function buildLegacyStaticNavItems(detail: CustomizationDetail): AnchorNavItem[] {
    const showOverview = hasReferenceOverview(detail);
    const showSpecs = hasReferenceSpecs(detail);
    const showWorksWith = hasReferenceWorksWith();
    const showShowcase = hasCustomizationShowcase(detail);
    const showFaqs = (detail.faqs?.length ?? 0) > 0;

    return [
        ...(showOverview
            ? [
                  {
                      id: CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
                      label: 'Benefits',
                  },
              ]
            : showSpecs
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
    ];
}

function templateHasCdpSections(sections: PageSection[] | null): boolean {
    if (!sections?.length) return false;
    return sections.some((s) => CDP_SECTION_TYPES.has(s._type));
}

function isLearnFirstTemplate(sections: PageSection[] | null): boolean {
    return Boolean(
        sections?.some((s) => s._type === 'customizationOverviewLearnFirst'),
    );
}

type WorksWithPayload = {
    option: WorksWithOptionRef;
    lines: ProductLineRef[];
    products: WorksWithProductCard[];
};

type CustomizationDetailViewProps = {
    detail: CustomizationDetail;
    peers?: CustomizationDetail[];
    category: string;
    handle: string;
};

/**
 * Customization detail — breadcrumb is route-owned; body is the template’s
 * `sections[]` (PROD-3112). Empty / pre-seed templates fall back to the legacy
 * hardcoded standard CDP so the site stays usable until humans seed sections.
 */
export function CustomizationDetailView({
    detail,
    peers = [],
    category,
    handle,
}: CustomizationDetailViewProps) {
    const categoryLabel = detail.categoryLabel || detail.categoryValue;
    const categoryListHref = `${WWW_ROUTES.customizations}?category=${encodeURIComponent(detail.categoryValue)}`;

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
            <div className="relative">
                <Suspense
                    fallback={
                        <CustomizationDetailLegacyBody
                            detail={detail}
                            peers={peers}
                            pageSections={null}
                            worksWith={{
                                option: {
                                    id: detail.id,
                                    category: detail.categoryValue,
                                    slug: detail.slug,
                                    title: detail.title,
                                },
                                lines: detail.productLines,
                                products: [],
                            }}
                            navItems={buildLegacyStaticNavItems(detail)}
                        />
                    }
                >
                    <CustomizationDetailBody
                        detail={detail}
                        peers={peers}
                        category={category}
                        handle={handle}
                    />
                </Suspense>
            </div>
        </>
    );
}

async function CustomizationDetailBody({
    detail,
    peers,
    category,
    handle,
}: {
    detail: CustomizationDetail;
    peers: CustomizationDetail[];
    category: string;
    handle: string;
}) {
    const [page, productLibrary, offerIndex] = await Promise.all([
        getCustomizationDetailPage(category, handle),
        listProductLibrary(),
        listProductOfferIndex(),
    ]);

    const pageSections = (page?.sections ?? null) as PageSection[] | null;
    const {products, lines} = buildWorksWithProducts({
        optionId: detail.id,
        productLibrary,
        offerIndex,
        preferredLines: detail.productLines,
    });

    const worksWith: WorksWithPayload = {
        option: {
            id: detail.id,
            category: detail.categoryValue,
            slug: detail.slug,
            title: detail.title,
        },
        lines,
        products,
    };

    const useTemplate = templateHasCdpSections(pageSections);
    const learnFirst = isLearnFirstTemplate(pageSections);
    const showStickyNav = page?.showStickyNav !== false;

    if (useTemplate && pageSections) {
        const navItems = pageSectionNavItems(pageSections, detail, learnFirst);
        const sectionsWithFaqs = applyFaqHostInherit(pageSections, detail);
        const overviewSections = sectionsWithFaqs.filter((s) =>
            OVERVIEW_SECTION_TYPES.has(s._type),
        );
        const bandSections = sectionsWithFaqs.filter(
            (s) => !OVERVIEW_SECTION_TYPES.has(s._type),
        );

        return (
            <CustomizationDetailHostProvider
                value={{
                    detail,
                    peers,
                    worksWith,
                    isLearnFirstTemplate: learnFirst,
                }}
            >
                <SectionRenderer sections={overviewSections} />
                {showStickyNav && navItems.length > 0 ? (
                    <AnchorNav items={navItems} />
                ) : null}
                <SectionRenderer sections={bandSections} />
            </CustomizationDetailHostProvider>
        );
    }

    return (
        <CustomizationDetailLegacyBody
            detail={detail}
            peers={peers}
            pageSections={pageSections}
            worksWith={worksWith}
            navItems={[
                ...buildLegacyStaticNavItems(detail),
                ...pageSectionNavItems(pageSections, detail, false),
            ]}
        />
    );
}

function applyFaqHostInherit(
    sections: PageSection[],
    detail: CustomizationDetail,
): PageSection[] {
    const optionFaqs = detail.faqs ?? [];
    if (optionFaqs.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'faqSection') return section;
        const faqs = 'faqs' in section ? section.faqs : null;
        if (faqs && faqs.length > 0) return section;
        return {
            ...section,
            faqs: optionFaqs.map((f) => ({
                question: f.question,
                answer: f.answer,
                answerPlain: f.answerPlain,
            })),
        } as PageSection;
    });
}

/**
 * Pre-seed / empty-template path — today’s hardcoded standard CDP + optional
 * CMS bands below. Removed once Default template sections are seeded.
 */
function CustomizationDetailLegacyBody({
    detail,
    peers,
    pageSections,
    worksWith,
    navItems,
}: {
    detail: CustomizationDetail;
    peers: CustomizationDetail[];
    pageSections: PageSection[] | null;
    worksWith: WorksWithPayload;
    navItems: AnchorNavItem[];
}) {
    const categoryLabel = detail.categoryLabel || detail.categoryValue;
    const reference = getReferenceCopy(detail.categoryValue, categoryLabel);
    const showOverview = hasReferenceOverview(detail);
    const showSpecs = hasReferenceSpecs(detail);
    const showWorksWith = hasReferenceWorksWith();
    const showShowcase = hasCustomizationShowcase(detail);
    const showFaqs = (detail.faqs?.length ?? 0) > 0;
    const sections = pageSections ?? [];
    const extraSections = sections.filter((s) => !CDP_SECTION_TYPES.has(s._type));

    return (
        <CustomizationDetailHostProvider
            value={{
                detail,
                peers,
                worksWith,
                isLearnFirstTemplate: false,
            }}
        >
            <CustomizationOverviewStandard />
            <AnchorNav items={navItems} />
            {showOverview || showSpecs ? (
                <CustomizationReferenceBenefitsSpecs
                    detail={detail}
                    compareLabel={reference.compareLabel}
                />
            ) : null}
            {showWorksWith ? (
                <CustomizationReferenceWorksWith
                    option={worksWith.option}
                    lines={worksWith.lines}
                    products={worksWith.products}
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
            {extraSections.length > 0 ? (
                <SectionRenderer sections={extraSections} />
            ) : null}
        </CustomizationDetailHostProvider>
    );
}
