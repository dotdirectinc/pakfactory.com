import Image from 'next/image';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CatalogCard} from '@/components/ui/catalog-card';
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

/** Minimal stage shell — no sections, services, or FAQs (Phase 1). */
export function ExpertiseStageShellView({
    stage,
}: {
    stage: ExpertiseStagePage;
}) {
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
                {...(stage.tagline
                    ? {eyebrow: stage.tagline}
                    : {})}
                {...(stage.description
                    ? {description: stage.description}
                    : {})}
            />
            {stage.diagramUrl ? (
                <PageDielineSection innerClassName="pb-24 pt-8">
                    <div className="relative aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-lg bg-muted">
                        <Image
                            src={stage.diagramUrl}
                            alt={stage.diagramAlt ?? stage.title}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 768px"
                        />
                    </div>
                </PageDielineSection>
            ) : null}
        </>
    );
}
