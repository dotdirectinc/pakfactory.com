import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageEnter} from '@/components/layout/page-enter';
import {ProductLineHero} from '@/components/product/product-line-hero';
import {CaseStudiesRow} from '@/components/sections/case-studies-row';
import {ExpertiseRow} from '@/components/sections/expertise-row';
import {FaqSection} from '@/components/sections/faq-section';
import {SectionRenderer} from '@/components/sections/section-renderer';
import {CatalogCard} from '@/components/ui/catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import {assembleProductLineLanding} from '@/lib/catalog/product-line-landing';
import type {
    ProductLine,
    ProductLineCaseStudyRef,
    ProductLineExpertiseRef,
} from '@/lib/catalog/types';
import type {
    ExpertiseRowContent,
    ExpertiseRowStage,
} from '@/lib/solutions/types';
import {
    expertiseHref,
    productHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-8';

function mapExpertiseContent(
    refs: ProductLineExpertiseRef[],
): ExpertiseRowContent {
    const stages: ExpertiseRowStage[] = refs.map((row) => {
        const body = row.description?.trim() || undefined;
        const diagramSrc = row.imageUrl?.trim();
        return {
            id: row.slug,
            title: row.title,
            ...(body ? {body} : {}),
            cta: {label: 'Learn more', href: expertiseHref(row.slug)},
            ...(diagramSrc
                ? {
                      media: {
                          src: diagramSrc,
                          alt: row.imageAlt?.trim() || row.title,
                      },
                  }
                : {mediaPlaceholder: row.title}),
        };
    });

    return {
        headline: 'Expertise',
        stages,
    };
}

function mapCaseStudyCards(refs: ProductLineCaseStudyRef[]) {
    return refs.map((study) => {
        const imageSrc = study.imageUrl?.trim();
        return {
            id: study.slug,
            brand: 'Case study',
            tag: study.cardSummary?.trim() || 'Featured',
            title: study.title,
            href: `${WWW_ROUTES.caseStudies}/${study.slug}`,
            ...(imageSrc
                ? {
                      image: {
                          src: imageSrc,
                          alt: study.imageAlt?.trim() || study.title,
                      },
                  }
                : {}),
        };
    });
}

/**
 * Product-line landing page composition (PROD-1914).
 * Scroll hero (Phase 3) + story-order bands; empty bands omitted.
 * Customizations / reviews / quote CTA come from merged Studio sections.
 */
export function ProductLineLanding({line}: {line: ProductLine}) {
    const model = assembleProductLineLanding(line);

    return (
        <PageEnter>
            <PageBreadcrumbSection
                band="muted"
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title},
                ]}
            />

            <ProductLineHero
                h1={model.h1}
                intro={model.intro}
                frames={model.frames}
                heroMode={model.heroMode}
                featuredImageUrl={model.featuredImageUrl}
                featuredImageAlt={model.featuredImageAlt}
                kitMarkUrl={model.kitMarkUrl}
                kitMarkAlt={model.kitMarkAlt}
                hasStyles={Boolean(model.styles)}
            />

            {model.expertise ? (
                <ExpertiseRow content={mapExpertiseContent(model.expertise)} />
            ) : null}

            {model.featuredStudies ? (
                <CaseStudiesRow
                    content={{
                        headline: 'Case studies',
                        cards: mapCaseStudyCards(model.featuredStudies),
                    }}
                />
            ) : null}

            {model.faqs ? (
                <FaqSection
                    sectionId="product-line-faqs"
                    items={model.faqs}
                    footerHref={WWW_ROUTES.contact}
                    footerLabel="Let's chat"
                />
            ) : null}

            {model.relatedLines ? (
                <PageDielineSection
                    as="section"
                    id="related-lines"
                    borderBottom
                    paddingBlock="md"
                    className="scroll-mt-32"
                >
                    <div className="flex flex-col gap-8">
                        <SectionHeading title="Related product lines" />
                        <div className={TILE_GRID_CLASS}>
                            {model.relatedLines.map((related) => (
                                <CatalogCard
                                    key={related.slug}
                                    href={productHref(related.slug)}
                                    title={related.title}
                                    description={
                                        related.shortDescription || undefined
                                    }
                                    imageSrc={related.imageUrl}
                                    imageAlt={
                                        related.imageAlt ?? related.title
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </PageDielineSection>
            ) : null}

            {model.pageSections.length > 0 ? (
                <SectionRenderer sections={model.pageSections} />
            ) : null}
        </PageEnter>
    );
}
