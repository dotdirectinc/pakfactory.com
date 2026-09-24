import type {PageSectionExpertiseSequenceDoc} from '@pakfactory/sanity/queries';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {
    PageHeadingSection,
    PageHeadingWithMedia,
} from '@/components/common/page-heading-section';
import {ExpertiseLifecycle} from '@/components/expertise/expertise-lifecycle';
import type {PageSection} from '@/components/sections/registry';
import {
    SectionRenderer,
    type SectionComponentOverrides,
} from '@/components/sections/section-renderer';
import {CatalogCard} from '@/components/ui/catalog-card';
import {
    applyStageSequenceInherit,
    mapExpertiseLifecycle,
} from '@/lib/expertise/lifecycle';
import {QUOTE_CTA_DEFAULT_LABEL} from '@/lib/sections/map-quote-cta';
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
 * body is the stage's `sections[]` in editor order. On this host
 * `expertiseSequence` renders as the lifecycle path with this stage current,
 * inheriting every stage in hub order when its list is empty.
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
    const components: SectionComponentOverrides = {
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
            <PageHeadingWithMedia
                title={stage.h1}
                {...(stage.tagline ? {eyebrow: stage.tagline} : {})}
                {...(stage.description
                    ? {description: stage.description}
                    : {})}
                primaryCta={{
                    label: stage.heroCtaLabel ?? QUOTE_CTA_DEFAULT_LABEL,
                    href: WWW_ROUTES.request,
                }}
                media={
                    stage.diagramUrl
                        ? {
                              src: stage.diagramUrl,
                              alt: stage.diagramAlt ?? stage.title,
                          }
                        : null
                }
            />
            <SectionRenderer sections={sections} components={components} />
        </>
    );
}
