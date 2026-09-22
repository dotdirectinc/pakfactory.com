import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {SolutionHero} from '@/components/solution/solution-hero';
import {SolutionExpertise} from '@/components/solution/solution-expertise';
import {SolutionInspirations} from '@/components/solution/solution-inspirations';
import {CaseStudiesRow} from '@/components/sections/case-studies-row';
import {VideoCaseStudiesRow} from '@/components/sections/video-case-studies-row';
import {FaqSection} from '@/components/sections/faq-section';
import {TestimonialsRow} from '@/components/sections/testimonials-row';
import {CatalogCard} from '@/components/ui/catalog-card';
import {
    LogoMarquee,
    type LogoMarqueeItem,
} from '@/components/ui/logo-marquee';
import {TextWithImage} from '@/components/ui/text-with-image';
import type {Product} from '@/lib/catalog/types';
import type {
    SolutionCard,
    SolutionLandingContent,
    SolutionLineCatalog,
    SolutionLogosContent,
} from '@/lib/solutions/types';
import {
    productHref,
    solutionHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-8';

const PRODUCT_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8';

function toProductCardData(product: Product): ProductCardData {
    const images = product.media
        .filter((item): item is {src: string; alt: string} =>
            Boolean(item.src),
        )
        .map((item) => ({
            src: item.src as string,
            alt: item.alt || product.title,
        }));
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        eyebrowLabel:
            product.productStyle?.title ?? product.productLine?.title,
        imageUrl: images[0]?.src ?? product.media[0]?.src ?? null,
        imageAlt: images[0]?.alt ?? product.media[0]?.alt ?? product.title,
        images: images.length > 0 ? images : undefined,
        moq: product.moq,
    };
}

function toLogoMarqueeItems(
    logos: SolutionLogosContent,
): LogoMarqueeItem[] {
    return logos.items.map((item) => ({
        id: item.id,
        name: item.name,
        imageSrc: item.imageSrc,
        href: item.href,
        linkLabel: item.linkLabel,
        width: item.width,
        height: item.height,
    }));
}

function SolutionLogosBand({logos}: {logos: SolutionLogosContent}) {
    const items = toLogoMarqueeItems(logos);
    if (items.length === 0) return null;

    return (
        <PageDielineSection
            as="section"
            aria-labelledby={
                logos.heading ? 'solution-logos-heading' : undefined
            }
            className="bg-background"
            innerClassName="border-b border-dashed border-border pb-16 pt-16"
        >
            {logos.heading ? (
                <h2 id="solution-logos-heading" className="sr-only">
                    {logos.heading}
                </h2>
            ) : null}
            {logos.subhead ? (
                <p className="mb-10 max-w-[720px] text-[15px] leading-[1.5] text-muted-foreground">
                    {logos.subhead}
                </p>
            ) : null}
            <LogoMarquee items={items} />
        </PageDielineSection>
    );
}

export function SolutionCatalogView({
    solutions,
}: {
    solutions: SolutionCard[];
}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Solutions'},
                ]}
            />
            <PageHeadingSection
                title="Solutions"
                description="Industry and channel packaging tailored to how you sell."
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={TILE_GRID_CLASS}>
                    {solutions.map((solution) => (
                        <CatalogCard
                            key={solution.slug}
                            href={solutionHref(solution.slug)}
                            title={solution.title}
                            description={solution.description}
                            imageSrc={solution.imageUrl}
                            imageAlt={solution.imageAlt ?? solution.title}
                        />
                    ))}
                </div>
            </PageDielineSection>
        </>
    );
}

/**
 * Industry Solution LP shell (PROD-1541).
 * Hero (Fork 2) when `content.hero` is set; otherwise thin heading.
 * Logos band (Fork 3) when `content.logos` is set.
 * Inspirations grid (Fork 4) when `content.inspirations` is set.
 * Customizations TextWithImage (Fork 5) when `content.customizations` is set.
 * Expertise StagesBoard (Fork 6) when `content.expertise` is set.
 * Case studies CaseStudiesRow (Fork 7) when `content.caseStudies` is set.
 * Video case studies VideoCaseStudiesRow when `content.videoCaseStudies` is set (under expand).
 * Testimonials TestimonialsRow (Fork 8) when `content.testimonials` is set.
 * FAQs FaqSection (Fork 9) when `content.faqs` is set.
 */
export function SolutionLandingView({
    content,
}: {
    content: SolutionLandingContent;
}) {
    const {
        solution,
        hero,
        logos,
        inspirations,
        customizations,
        expertise,
        caseStudies,
        videoCaseStudies,
        testimonials,
        faqs,
    } = content;

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Solutions', href: WWW_ROUTES.solutions},
                    {label: solution.shortName},
                ]}
            />
            {hero ? (
                <SolutionHero content={hero} />
            ) : (
                <PageHeadingSection
                    title={solution.h1}
                    description={
                        solution.shortDescription || undefined
                    }
                />
            )}
            {logos ? <SolutionLogosBand logos={logos} /> : null}
            {inspirations ? (
                <SolutionInspirations content={inspirations} />
            ) : null}
            {customizations ? (
                <TextWithImage
                    id="customizations"
                    eyebrow={customizations.eyebrow}
                    title={customizations.headline}
                    body={customizations.body}
                    cta={customizations.cta}
                    image={customizations.image}
                />
            ) : null}
            {expertise ? (
                <SolutionExpertise content={expertise} />
            ) : null}
            {caseStudies ? (
                <CaseStudiesRow content={caseStudies} />
            ) : null}
            {videoCaseStudies ? (
                <VideoCaseStudiesRow content={videoCaseStudies} />
            ) : null}
            {testimonials ? (
                <TestimonialsRow
                    sectionId="solution-testimonials"
                    items={testimonials.items}
                    aggregate={testimonials.aggregate}
                    title={testimonials.title}
                    description={testimonials.description}
                />
            ) : null}
            {faqs ? (
                <FaqSection
                    sectionId="solution-faqs"
                    items={faqs.items}
                    heading={faqs.heading}
                    description={faqs.description}
                    footerHref={faqs.footerHref}
                    footerLabel={faqs.footerLabel}
                    borderBottom={false}
                />
            ) : null}
        </>
    );
}

export function SolutionLineCatalogView({
    catalog,
}: {
    catalog: SolutionLineCatalog;
}) {
    const {solution, line, products} = catalog;
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Solutions', href: WWW_ROUTES.solutions},
                    {
                        label: solution.shortName,
                        href: solutionHref(solution.slug),
                    },
                    {label: line.title},
                ]}
            />
            <PageHeadingSection
                title={line.title}
                description={line.description}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                {products.length > 0 ? (
                    <div className={PRODUCT_GRID_CLASS}>
                        {products.map((product) => (
                            <ProductCard
                                key={product.slug}
                                data={toProductCardData(product)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">
                        No products tagged for this solution and format yet.
                    </p>
                )}
            </PageDielineSection>
        </>
    );
}
