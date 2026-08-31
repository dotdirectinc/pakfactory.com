import Link from 'next/link';
import {PackageIcon} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import type {Product, ProductLine, ProductStyleRef} from '@/lib/catalog/types';
import {productHref, productStyleHref, WWW_ROUTES} from '@/lib/www-routes';

const TILE_GRID_CLASS = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

function TileMedia({src, alt}: {src?: string; alt: string}) {
    return (
        <div className="flex aspect-square items-center justify-center">
            {src ? (
                <img src={src} alt={alt} className="h-full w-full object-cover" />
            ) : (
                <PackageIcon
                    className="size-12 text-muted-foreground opacity-40"
                    aria-hidden
                />
            )}
        </div>
    );
}

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

function LineTile({line}: {line: ProductLine}) {
    return (
        <Link
            href={productHref(line.slug)}
            className="group flex flex-col overflow-hidden rounded-xl bg-muted transition-shadow hover:shadow-md"
        >
            <TileMedia alt={line.title} />
            <div className="flex flex-col gap-1 p-4">
                <p className="text-sm font-semibold">{line.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                    {line.description}
                </p>
            </div>
        </Link>
    );
}

function StyleTile({
    line,
    style,
}: {
    line: ProductLine;
    style: ProductStyleRef;
}) {
    const count = line.products.filter(
        (product) => product.productStyle.slug === style.slug,
    ).length;
    return (
        <Link
            href={productStyleHref(line.slug, style.slug)}
            className="group flex flex-col overflow-hidden rounded-xl bg-muted transition-shadow hover:shadow-md"
        >
            <TileMedia alt={style.title} />
            <div className="flex flex-col gap-1 p-4">
                <p className="text-sm font-semibold">{style.title}</p>
                <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? 'product' : 'products'}
                </p>
            </div>
        </Link>
    );
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
                        <LineTile key={line.slug} line={line} />
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
                    {line.styles.map((style) => (
                        <StyleTile key={style.slug} line={line} style={style} />
                    ))}
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
                description={`${style.title} styles in ${line.title}.`}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={TILE_GRID_CLASS}>
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
