import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {SolutionHero} from '@/components/solution/solution-hero';
import {SolutionInspirations} from '@/components/solution/solution-inspirations';
import {CatalogCard} from '@/components/ui/catalog-card';
import {
    LogoMarquee,
    type LogoMarqueeItem,
} from '@/components/ui/logo-marquee';
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
            bleed
            borderBottom
            aria-labelledby={
                logos.heading ? 'solution-logos-heading' : undefined
            }
            className="bg-background"
            innerClassName="pb-16 pt-16"
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
 */
export function SolutionLandingView({
    content,
}: {
    content: SolutionLandingContent;
}) {
    const {solution, hero, logos, inspirations} = content;

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
            {solution.relatedProducts.length > 0 ? (
                <PageDielineSection innerClassName="pb-24 pt-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-medium tracking-tight text-foreground">
                            Related products
                        </h2>
                    </div>
                    <div className={PRODUCT_GRID_CLASS}>
                        {solution.relatedProducts.map((product) => (
                            <ProductCard
                                key={product.slug}
                                data={toProductCardData(product)}
                            />
                        ))}
                    </div>
                </PageDielineSection>
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
