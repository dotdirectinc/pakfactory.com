import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {CustomizationComparison} from '@/components/customization/customization-comparison';
import {CustomizationConfigPanel} from '@/components/customization/customization-config-panel';
import {ProductGallery} from '@/components/product/product-gallery';
import {
    CustomizationReferenceOverview,
    CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
    hasReferenceOverview,
} from '@/components/customization/customization-reference-overview';
import {
    CustomizationReferenceSpecs,
    CUSTOMIZATION_REFERENCE_SPECS_ID,
    hasReferenceSpecs,
} from '@/components/customization/customization-reference-specs';
import {
    CustomizationReferenceWorksWith,
    CUSTOMIZATION_REFERENCE_WORKS_WITH_ID,
    hasReferenceWorksWith,
} from '@/components/customization/customization-reference-works-with';
import {CustomizationShowcase} from '@/components/customization/customization-showcase';
import {AnchorNav, type AnchorNavItem} from '@/components/product/anchor-nav';
import {FaqSection} from '@/components/sections/faq-section';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {StatusBadge} from '@/components/ui/status-badge';
import {
    formatSectionEyebrow,
    SectionHeading,
} from '@/components/ui/section-heading';
import {getReferenceCopy} from '@/lib/catalog/reference-copy';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

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

type CustomizationDetailViewProps = {
    detail: CustomizationDetail;
    peers?: CustomizationDetail[];
    /** Shared bands from `customizationDetailPage` layout (template → Default). */
    pageSections?: PageSection[] | null;
};

/**
 * Customization detail (PROD-1299: above-fold, Material Reference, comparison + Slice H chrome).
 */
export function CustomizationDetailView({
    detail,
    peers = [],
    pageSections = null,
}: CustomizationDetailViewProps) {
    const categoryLabel = detail.categoryLabel || detail.categoryValue;
    const categoryListHref = `${WWW_ROUTES.customizations}?category=${encodeURIComponent(detail.categoryValue)}`;
    const reference = getReferenceCopy(detail.categoryValue, categoryLabel);

    const showOverview = hasReferenceOverview(detail);
    const showSpecs = hasReferenceSpecs(detail);
    const showWorksWith = hasReferenceWorksWith();

    const navItems: AnchorNavItem[] = [];
    if (showOverview) {
        navItems.push({
            id: CUSTOMIZATION_REFERENCE_OVERVIEW_ID,
            label: 'Benefits',
        });
    }
    if (showSpecs) {
        navItems.push({
            id: CUSTOMIZATION_REFERENCE_SPECS_ID,
            label: 'Specs & performance',
        });
    }
    if (showWorksWith) {
        navItems.push({
            id: CUSTOMIZATION_REFERENCE_WORKS_WITH_ID,
            label: 'Works with',
        });
    }

    const showReferenceBand = showOverview || showSpecs || showWorksWith;

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
                paddingBlock="sm"
                innerClassName="border-b border-dashed border-border"
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

            {showReferenceBand ? (
                <PageDielineSection innerClassName="border-b border-dashed border-border">
                    <SectionHeading
                        eyebrow={reference.eyebrow}
                        title={reference.title}
                        description={reference.description}
                        descriptionClassName="mb-20 sm:mb-10"
                    />

                    <AnchorNav embedded items={navItems} />

                    {showOverview ? (
                        <CustomizationReferenceOverview detail={detail} />
                    ) : null}
                    {showSpecs ? (
                        <CustomizationReferenceSpecs
                            detail={detail}
                            compareLabel={reference.compareLabel}
                        />
                    ) : null}
                    {showWorksWith ? (
                        <CustomizationReferenceWorksWith detail={detail} />
                    ) : null}
                </PageDielineSection>
            ) : null}

            <CustomizationComparison detail={detail} peers={peers} />
            <CustomizationShowcase detail={detail} />
            <FaqSection
                sectionId="customization-faqs"
                items={detail.faqs ?? []}
                footerHref={WWW_ROUTES.contact}
                footerLabel="Let's chat"
            />
            <SectionRenderer sections={pageSections} />
        </>
    );
}
