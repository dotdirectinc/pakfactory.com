// Source: shadcn-studio (product-grid-01)
import Link from 'next/link';
import {ArrowRightIcon, PackageIcon} from 'lucide-react';

import {cn} from '@pakfactory/ui/lib/utils';

import {
    fetchProductCatalog,
    solutionTypeLabel,
    type ProductCatalogItem,
    type ProductCatalogPage,
} from '@/lib/sanity/product-catalog';

// ---------------------------------------------------------------------------
// Landing page card
// ---------------------------------------------------------------------------
function LandingPageCard({page}: {page: ProductCatalogPage}) {
    return (
        <Link
            href={`/products/${page.slug}`}
            className="group relative flex h-full min-h-0 w-full flex-col justify-center overflow-hidden rounded-xl bg-gray-400/30 p-6 transition-colors gap-4 hover:bg-gray-400/50 "
        >
            <div className="flex flex-col gap-3">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                    {solutionTypeLabel(page.solutionType)}
                </span>
                <h3 className="text-foreground text-2xl font-bold leading-tight">
                    {page.heroHeadline}
                </h3>
            </div>

            <span className="text-foreground/70 group-hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors">
                Learn more
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------
function ProductCard({product}: {product: ProductCatalogItem}) {
    const href =
        product.pageSlug && product.collectionSlug
            ? `/products/${product.pageSlug}/${product.collectionSlug}/${product.sku}`
            : '#';

    return (
        <Link
            href={href}
            className="group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl  transition-shadow hover:shadow-md bg-[#ececec]"
        >
            {/* Image */}
            <div className="relative aspect-square w-full shrink-0 flex items-center justify-center overflow-hidden">
                {product.thumbUrl ? (
                    <img
                        src={product.thumbUrl}
                        alt={product.thumbAlt ?? product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <PackageIcon className="text-muted-foreground size-12 opacity-40" />
                )}
            </div>

            {/* Info */}
            <div className="flex shrink-0 flex-col gap-1 p-4">
                <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    SKUID
                </span>

                <p className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">
                    {product.name}
                </p>
                {product.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {product.description}
                    </p>
                )}
            </div>
        </Link>
    );
}

// ---------------------------------------------------------------------------
// Root — server component, fetches its own data
// ---------------------------------------------------------------------------
export default async function ProductGrid({className}: {className?: string}) {
    const result = await fetchProductCatalog();

    if (result.kind === 'not_configured') {
        return (
            <div className={cn('flex flex-col gap-8', className)}>
                <Placeholder message="Connect Sanity to display products." />
            </div>
        );
    }

    if (result.kind === 'fetch_failed') {
        return (
            <div className={cn('flex flex-col gap-8', className)}>
                <Placeholder message="Could not load products. Please try again." />
            </div>
        );
    }

    const pages = result.pages.filter((p) => p.products.length > 0);

    if (pages.length === 0) {
        return (
            <div className={cn('flex flex-col gap-8', className)}>
                <Placeholder message="No products yet. Add products in Sanity Studio." />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
                className,
            )}
        >
            {pages.flatMap((page) => [
                <LandingPageCard key={`${page._id}-line`} page={page} />,
                ...page.products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                )),
            ])}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Placeholder (empty states)
// ---------------------------------------------------------------------------
function Placeholder({message}: {message: string}) {
    return (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}
