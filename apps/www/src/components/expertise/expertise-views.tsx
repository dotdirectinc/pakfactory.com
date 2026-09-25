import type {
    PageSectionCaseStudiesRowDoc,
    PageSectionFaqSectionDoc,
    PageSectionInspirationsGridDoc,
    PageSectionLogoWallDoc,
    PageSectionExpertiseSequenceDoc,
    PageSectionMediaFeatureDoc,
    PageSectionQuoteCtaDoc,
} from '@pakfactory/sanity/queries';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ExpertiseHero} from '@/components/expertise/expertise-hero';
import {ExpertiseLifecycle} from '@/components/expertise/expertise-lifecycle';
import {CaseStudyRail} from '@/components/sections/case-study-rail';
import {FaqSection} from '@/components/sections/faq-section';
import {InspirationGallery} from '@/components/sections/inspiration-gallery';
import {LogoWall} from '@/components/sections/logo-wall';
import {WorkShowcase} from '@/components/sections/work-showcase';
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
import {mapWorkShowcase} from '@/lib/expertise/map-work-showcase';
import {
    expertiseSectionAnchor,
    expertiseSectionHref,
} from '@/lib/expertise/section-anchor';
import {mapCaseStudiesRow} from '@/lib/sections/map-case-studies-row';
import {mapFaqSection} from '@/lib/sections/map-faq-section';
import {mapInspirationsGrid} from '@/lib/sections/map-inspirations-grid';
import {mapLogoWall} from '@/lib/sections/map-logo-wall';
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
 * Breadcrumb + hero are route-owned (ADR-020 §2): the POC `ExpertiseHero`
 * with H1, tagline, description, the quote button, an optional in-page link
 * (label + target section type from the stage) and an optional hero image. The
 * body is the template's `sections[]` in editor order, wrapped in
 * `.expertise-stage` so SectionHeading takes the POC style (no V5 brackets).
 * On this host some shared Sections take the expertise (POC) presentation:
 * `expertiseSequence` → the lifecycle path with this stage current (inheriting
 * every stage in hub order when its list is empty), `mediaFeature` →
 * MediaPanel, `caseStudiesRow` on the muted band, `logoWall` as the trust
 * strip, `inspirationsGrid` → WorkShowcase, `quoteCta` as the dark closing band.
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
    const heroLinkHref = stage.heroSecondary
        ? expertiseSectionHref(sections, stage.heroSecondary.target)
        : null;
    // Expertise-page renderings of shared Sections (POC design). Same Sanity
    // data; other hosts keep the registry defaults.
    const components: SectionComponentOverrides = {
        mediaFeature: (section: PageSection) => {
            const mapped = mapMediaPanel(
                section as PageSectionMediaFeatureDoc,
            );
            return mapped ? (
                <MediaPanel
                    {...mapped}
                    id={expertiseSectionAnchor('mediaFeature', section._key)!}
                />
            ) : null;
        },
        caseStudiesRow: (section: PageSection) => {
            const mapped = mapCaseStudiesRow(
                section as PageSectionCaseStudiesRowDoc,
            );
            return mapped.cards.length > 0 ? (
                <CaseStudyRail
                    content={mapped}
                    id={`case-studies-${section._key}`}
                />
            ) : null;
        },
        // Trust strip (POC `TrustedBrands`): thin dashed strip, visible label,
        // 72px logos, the POC's 40s lap.
        logoWall: (section: PageSection) => {
            const mapped = mapLogoWall(section as PageSectionLogoWallDoc);
            if (mapped.items.length === 0) return null;
            return (
                <LogoWall
                    content={{
                        ...mapped,
                        ...(mapped.subhead || !mapped.heading
                            ? {}
                            : {subhead: mapped.heading}),
                    }}
                    headingId={`logo-wall-${section._key}`}
                    marqueeDuration={40}
                    variant="strip"
                />
            );
        },
        // Case-study-led work showcase (pinned zoom-out reveal) when the
        // gallery links case studies; otherwise the regular gallery.
        inspirationsGrid: (section: PageSection) => {
            const doc = section as PageSectionInspirationsGridDoc;
            const id = expertiseSectionAnchor('inspirationsGrid', section._key)!;
            const showcase = mapWorkShowcase(doc);
            if (showcase) {
                return <WorkShowcase content={showcase} id={id} />;
            }
            const mapped = mapInspirationsGrid(doc);
            return mapped.cards.length > 0 ? (
                <InspirationGallery content={mapped} id={id} />
            ) : null;
        },
        // FAQ as full-width divider rows, left-aligned (POC `ExpertiseFaq`);
        // no stock intro — only the editor's, when there is one.
        faqSection: (section: PageSection) => {
            const mapped = mapFaqSection(section as PageSectionFaqSectionDoc);
            if (mapped.items.length === 0) return null;
            return (
                <FaqSection
                    variant="rows"
                    sectionId={expertiseSectionAnchor('faqSection', section._key)!}
                    items={mapped.items}
                    heading={mapped.heading}
                    description={mapped.intro ?? ''}
                    eyebrow={mapped.eyebrow}
                    align="left"
                    borderTop={mapped.borderTop}
                    borderBottom={mapped.borderBottom}
                    cta={mapped.cta}
                />
            );
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
            <ExpertiseHero
                title={stage.h1}
                {...(stage.tagline ? {eyebrow: stage.tagline} : {})}
                {...(stage.description ? {subhead: stage.description} : {})}
                primaryCta={{
                    label: stage.heroCtaLabel ?? QUOTE_CTA_DEFAULT_LABEL,
                    href: WWW_ROUTES.request,
                }}
                {...(heroLinkHref && stage.heroSecondary
                    ? {secondaryCta: {label: stage.heroSecondary.label, href: heroLinkHref}}
                    : {})}
                {...(stage.heroImageUrl
                    ? {image: {src: stage.heroImageUrl, alt: stage.heroImageAlt ?? stage.title}}
                    : {})}
            />
            {/* Scopes the POC heading style (globals.css) to this page. */}
            <div className="expertise-stage">
                <SectionRenderer sections={sections} components={components} />
            </div>
        </>
    );
}
