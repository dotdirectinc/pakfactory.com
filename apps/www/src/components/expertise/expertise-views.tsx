import Image from 'next/image';
import type {
    PageSectionCaseStudiesRowDoc,
    PageSectionExpertiseSequenceDoc,
    PageSectionMediaFeatureDoc,
    PageSectionQuoteCtaDoc,
} from '@pakfactory/sanity/queries';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ExpertiseLifecycle} from '@/components/expertise/expertise-lifecycle';
import {CaseStudiesRow} from '@/components/sections/case-studies-row';
import {QuoteCta} from '@/components/sections/quote-cta';
import type {PageSection} from '@/components/sections/registry';
import {
    SectionRenderer,
    type SectionComponentOverrides,
} from '@/components/sections/section-renderer';
import {CatalogCard} from '@/components/ui/catalog-card';
import {MediaPanel} from '@/components/ui/media-panel';
import {
    applyStageSequenceInherit,
    mapExpertiseLifecycle,
} from '@/lib/expertise/lifecycle';
import {mapCaseStudiesRow} from '@/lib/sections/map-case-studies-row';
import {mapMediaPanel} from '@/lib/sections/map-media-panel';
import {
    mapQuoteCta,
    QUOTE_CTA_DEFAULT_LABEL,
} from '@/lib/sections/map-quote-cta';
import type {
    ExpertiseStageCard,
    ExpertiseStagePage,
} from '@/lib/expertise/types';
import {expertiseHref, WWW_ROUTES} from '@/lib/www-routes';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8';

export function ExpertiseCatalogView({
    stages,
}: {
    stages: ExpertiseStageCard[];
}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Expertise'},
                ]}
            />
            <PageHeadingSection
                title="Expertise"
                description="Packaging expertise across design, prototyping, manufacturing, strategy, logistics, and fulfillment."
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                {stages.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Expertise stages will appear here once published in
                        Sanity.
                    </p>
                ) : (
                    <div className={TILE_GRID_CLASS}>
                        {stages.map((stage) => (
                            <CatalogCard
                                key={stage.slug}
                                href={expertiseHref(stage.slug)}
                                title={stage.title}
                                description={stage.description}
                                imageSrc={stage.imageUrl}
                                imageAlt={stage.imageAlt ?? stage.title}
                            />
                        ))}
                    </div>
                )}
            </PageDielineSection>
        </>
    );
}

/**
 * Expertise stage detail page — the one template every stage renders through
 * (PROD-1108 / PROD-2469, first used by PROD-2577 Strategy).
 *
 * Breadcrumb + hero are route-owned (ADR-020 §2): H1, tagline, description and
 * diagram come from the stage; the hero button opens the quote request. The
 * body is the stage's `sections[]` in editor order. On this host some shared
 * Sections take the expertise (POC) presentation: `expertiseSequence` → the
 * lifecycle path with this stage current (inheriting every stage in hub order
 * when its list is empty), `mediaFeature` → MediaPanel, `caseStudiesRow` on the
 * muted band, `quoteCta` as the dark closing band.
 */
export function ExpertiseStageView({
    stage,
    orderedStages,
}: {
    stage: ExpertiseStagePage;
    /** All stages in hub order (featured pins, then title). */
    orderedStages: ExpertiseStageCard[];
}) {
    const sections = applyStageSequenceInherit(stage.sections, orderedStages);
    // Expertise-page renderings of shared Sections (POC design). Same Sanity
    // data; other hosts keep the registry defaults.
    const components: SectionComponentOverrides = {
        mediaFeature: (section: PageSection) => {
            const mapped = mapMediaPanel(
                section as PageSectionMediaFeatureDoc,
            );
            return mapped ? (
                <MediaPanel {...mapped} id={`engagement-${section._key}`} />
            ) : null;
        },
        caseStudiesRow: (section: PageSection) => {
            const mapped = mapCaseStudiesRow(
                section as PageSectionCaseStudiesRowDoc,
            );
            return mapped.cards.length > 0 ? (
                <CaseStudiesRow
                    content={mapped}
                    id={`case-studies-${section._key}`}
                    theme="muted"
                />
            ) : null;
        },
        quoteCta: (section: PageSection) => {
            const mapped = mapQuoteCta(section as PageSectionQuoteCtaDoc);
            return (
                <QuoteCta
                    id={`quote-cta-${section._key}`}
                    heading={mapped.heading}
                    body={mapped.body ?? ''}
                    ctaLabel={mapped.ctaLabel}
                    href={mapped.href}
                    theme="inverse"
                    align="left"
                />
            );
        },
        expertiseSequence: (section: PageSection) => {
            const mapped = mapExpertiseLifecycle(
                section as PageSectionExpertiseSequenceDoc,
                stage.slug,
            );
            return mapped ? (
                <ExpertiseLifecycle
                    content={mapped}
                    id={`lifecycle-${section._key}`}
                />
            ) : null;
        },
    };

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Expertise', href: WWW_ROUTES.expertise},
                    {label: stage.title},
                ]}
            />
            <PageHeadingSection
                title={stage.h1}
                {...(stage.tagline ? {eyebrow: stage.tagline} : {})}
                {...(stage.description
                    ? {description: stage.description}
                    : {})}
                primaryCta={{
                    label: stage.heroCtaLabel ?? QUOTE_CTA_DEFAULT_LABEL,
                    href: WWW_ROUTES.request,
                }}
                borderBottom={!stage.diagramUrl}
            />
            {stage.diagramUrl ? (
                // Hero media as a full-width band under the copy (POC layout).
                <PageDielineSection borderBottom paddingBlock="sm">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted lg:aspect-[21/9]">
                        <Image
                            src={stage.diagramUrl}
                            alt={stage.diagramAlt ?? stage.title}
                            fill
                            priority
                            className="object-cover"
                            sizes="(max-width: 1280px) 100vw, 1280px"
                        />
                    </div>
                </PageDielineSection>
            ) : null}
            <SectionRenderer sections={sections} components={components} />
        </>
    );
}
