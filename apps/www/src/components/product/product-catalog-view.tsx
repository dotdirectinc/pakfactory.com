import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ProductCatalogCard} from '@/components/product/product-catalog-card';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import type {Product, ProductLine, ProductStyleRef} from '@/lib/catalog/types';
import {productHref, productStyleHref, WWW_ROUTES} from '@/lib/www-routes';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-8';

const PRODUCT_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8';

function toProductCardData(
    product: Product,
    line: ProductLine,
): ProductCardData {
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        eyebrowLabel: product.productStyle.title ?? line.title,
        imageUrl: product.media[0]?.src ?? null,
        imageAlt: product.media[0]?.alt ?? product.title,
        moq: product.moq,
    };
}

export function ProductCatalogView({lines}: {lines: ProductLine[]}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products'},
                ]}
            />
            <PageHeadingSection
                title="Products"
                description="Custom packaging solutions tailored to your brand."
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={TILE_GRID_CLASS}>
                    {lines.map((line) => (
                        <ProductCatalogCard
                            key={line.slug}
                            href={productHref(line.slug)}
                            title={line.title}
                            description={line.description || undefined}
                            imageSrc={line.imageUrl}
                            imageAlt={line.imageAlt ?? line.title}
                        />
                    ))}
                </div>
            </PageDielineSection>
        </>
    );
}

export function ProductLineView({line}: {line: ProductLine}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title},
                ]}
            />
            <PageHeadingSection
                title={line.title}
                description={line.description}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={TILE_GRID_CLASS}>
                    {line.styles.map((style) => {
                        const firstProductImage = line.products.find(
                            (product) =>
                                product.productStyle.slug === style.slug &&
                                product.media[0]?.src,
                        )?.media[0]?.src;
                        return (
                            <ProductCatalogCard
                                key={style.slug}
                                href={productStyleHref(line.slug, style.slug)}
                                title={style.title}
                                description={
                                    style.shortDescription || undefined
                                }
                                imageSrc={style.imageUrl ?? firstProductImage}
                                imageAlt={style.imageAlt ?? style.title}
                            />
                        );
                    })}
                </div>
            </PageDielineSection>
        </>
    );
}

export function ProductStyleView({
    line,
    style,
}: {
    line: ProductLine;
    style: ProductStyleRef;
}) {
    const products = line.products.filter(
        (product) => product.productStyle.slug === style.slug,
    );
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title, href: productHref(line.slug)},
                    {label: style.title},
                ]}
            />
            <PageHeadingSection
                title={style.title}
                description={style.description}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={PRODUCT_GRID_CLASS}>
                    {products.map((product) => (
                        <ProductCard
                            key={product.slug}
                            data={toProductCardData(product, line)}
                        />
                    ))}
                </div>
            </PageDielineSection>
        </>
    );
}
