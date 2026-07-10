// Source: shadcn-studio (product-collection-list)
import Image from 'next/image';
import Link from 'next/link';
import {PackageIcon} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

export type ProductCollectionListItem = {
    _id: string;
    title: string | null;
    slug: string;
    thumbUrl?: string | null;
    thumbAlt?: string | null;
};

type ProductCollectionListProps = {
    collections: ProductCollectionListItem[];
    pageSlug: string;
    title: string;
    subtitle?: string | null;
    overline?: string;
    cta?: {label: string; href: string} | null;
    className?: string;
};

function ProductCollectionListCard({
    collection,
    href,
}: {
    collection: ProductCollectionListItem;
    href: string;
}) {
    const displayName = collection.title?.trim() || 'Collection';

    return (
        <Link
            href={href}
            className="group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-muted/60 "
        >
            <div className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ececec]">
                {collection.thumbUrl ? (
                    <Image
                        src={collection.thumbUrl}
                        alt={collection.thumbAlt ?? displayName}
                        width={480}
                        height={480}
                        className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                ) : (
                    <PackageIcon className="text-muted-foreground size-12 opacity-40" />
                )}
            </div>

            <div className="flex shrink-0 flex-col gap-1.5 px-1 pt-4 pb-1">
                <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    Collection
                </span>
                <p className="text-primary line-clamp-2 text-sm font-semibold leading-snug transition-colors duration-200 group-hover:text-foreground">
                    {displayName}
                </p>
            </div>
        </Link>
    );
}

export default function ProductCollectionList({
    collections,
    pageSlug,
    title,
    subtitle,
    overline = 'Explore styles',
    cta,
    className,
}: ProductCollectionListProps) {
    return (
        <section
            id="product-line-collections"
            tabIndex={-1}
            className={cn('scroll-mt-24 bg-[#F7F7F7]', className)}
        >
            <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                    <div className="max-w-3xl flex flex-col gap-3">
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                            {title} Types
                        </p>
                        <h2 className="text-foreground text-2xl font-bold tracking-tight text-balance md:text-4xl lg:text-4xl">
                            Explore {title} by Type
                        </h2>
                        {/* {subtitle?.trim() ? (
                            <p className="text-muted-foreground max-w-2xl text-pretty text-base leading-relaxed md:text-lg">
                                {subtitle.trim()}
                            </p>
                        ) : null} */}
                    </div>

                    {cta ? (
                        <div className="shrink-0 lg:pb-1">
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-full border-emerald-800 bg-transparent text-emerald-900 shadow-none hover:bg-emerald-950/5 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-950/20"
                                asChild
                            >
                                <Link href={cta.href}>{cta.label}</Link>
                            </Button>
                        </div>
                    ) : null}
                </div>

                {collections.length === 0 ? (
                    <p className="text-muted-foreground mt-12 text-sm">
                        No collections for this product line yet.
                    </p>
                ) : (
                    <ul className="mt-12 grid list-none grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {collections.map((c) => {
                            const href = `/products/${pageSlug}/${c.slug}`;
                            return (
                                <li key={c._id}>
                                    <ProductCollectionListCard
                                        collection={c}
                                        href={href}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
