import Link from 'next/link';
import {PackageIcon} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import type {Product, ProductLine, ProductStyleRef} from '@/lib/catalog/types';
import {productHref, productStyleHref, WWW_ROUTES} from '@/lib/www-routes';

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

function ProductTile({product}: {product: Product}) {
    return (
        <Link
            href={productHref(product.slug)}
            className="group flex flex-col overflow-hidden rounded-xl bg-muted transition-shadow hover:shadow-md"
        >
            <TileMedia src={product.media[0]?.src} alt={product.media[0]?.alt ?? product.title} />
            <div className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{product.title}</p>
                    {product.kind === 'inspiration' ? (
                        <Badge variant="secondary">Inspiration</Badge>
                    ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                    {product.description}
                </p>
            </div>
        </Link>
    );
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
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                <p className="mt-2 text-muted-foreground">
                    Custom packaging solutions tailored to your brand.
                </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lines.map((line) => (
                    <LineTile key={line.slug} line={line} />
                ))}
            </div>
        </div>
    );
}

export function ProductLineView({line}: {line: ProductLine}) {
    return (
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
            <header>
                <p className="text-sm text-muted-foreground">
                    <Link href={WWW_ROUTES.products} className="hover:underline">
                        Products
                    </Link>
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{line.title}</h1>
                <p className="mt-2 text-muted-foreground">{line.description}</p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {line.styles.map((style) => (
                    <StyleTile key={style.slug} line={line} style={style} />
                ))}
            </div>
        </div>
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
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
            <header>
                <p className="text-sm text-muted-foreground">
                    <Link href={WWW_ROUTES.products} className="hover:underline">
                        Products
                    </Link>
                    {' · '}
                    <Link href={productHref(line.slug)} className="hover:underline">
                        {line.title}
                    </Link>
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{style.title}</h1>
                <p className="mt-2 text-muted-foreground">
                    {style.title} styles in {line.title}.
                </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                    <ProductTile key={product.slug} product={product} />
                ))}
            </div>
        </div>
    );
}
