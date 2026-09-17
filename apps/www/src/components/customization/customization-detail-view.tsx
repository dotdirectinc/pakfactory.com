import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {CustomizationComparison} from '@/components/customization/customization-comparison';
import {CustomizationConfigPanel} from '@/components/customization/customization-config-panel';
import {CustomizationFormed} from '@/components/customization/customization-formed';
import {CustomizationOptionGallery} from '@/components/customization/customization-option-gallery';
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
import {
    formatSectionEyebrow,
    SectionHeading,
} from '@/components/ui/section-heading';
import {getReferenceCopy} from '@/lib/catalog/reference-copy';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

type CustomizationDetailViewProps = {
    detail: CustomizationDetail;
};

/**
 * Customization detail (PROD-1299: above-fold, Material Reference, comparison + Slice H chrome).
 */
export function CustomizationDetailView({detail}: CustomizationDetailViewProps) {
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
            label: 'Overview',
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

    const showReferenceBand =
        showOverview || showSpecs || showWorksWith;

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
            <PageDielineSection innerClassName="border-b border-dashed border-border">
                <article
                    id="customization-overview"
                    className="scroll-mt-32 grid gap-10 py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <CustomizationOptionGallery
                        media={detail.media}
                        title={detail.title}
                    />
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-blue uppercase">
                            {formatSectionEyebrow(categoryLabel)}
                        </p>
                        <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                            {detail.title}
                        </h1>
                        {detail.description ? (
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                                {detail.description}
                            </p>
                        ) : null}
                        <CustomizationConfigPanel detail={detail} />
                    </div>
                </article>
            </PageDielineSection>

            {showReferenceBand ? (
                <PageDielineSection innerClassName="border-b border-dashed border-border">
                    <div className="pt-16 pb-8 sm:pt-20">
                        <SectionHeading
                            eyebrow={reference.eyebrow}
                            title={reference.title}
                            description={reference.description}
                            descriptionClassName="text-base leading-6"
                        />
                    </div>

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

            <CustomizationComparison />
            <CustomizationShowcase detail={detail} />
            <CustomizationFormed />
            <FaqSection
                sectionId="customization-faqs"
                items={detail.faqs ?? []}
                footerHref={WWW_ROUTES.contact}
                footerLabel="Let's chat"
            />
        </>
    );
}
