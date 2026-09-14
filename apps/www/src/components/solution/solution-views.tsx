import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {CatalogCard} from '@/components/ui/catalog-card';
import type {Product} from '@/lib/catalog/types';
import type {
    SolutionCard,
    SolutionLineCatalog,
    SolutionPage,
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
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        eyebrowLabel:
            product.productStyle?.title ?? product.productLine?.title,
        imageUrl: product.media[0]?.src ?? null,
        imageAlt: product.media[0]?.alt ?? product.title,
        moq: product.moq,
    };
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

export function SolutionLandingView({solution}: {solution: SolutionPage}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Solutions', href: WWW_ROUTES.solutions},
                    {label: solution.shortName},
                ]}
            />
            <PageHeadingSection
                title={solution.h1}
                description={
                    solution.shortDescription || undefined
                }
            />
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
