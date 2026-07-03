// Source: shadcn-studio (product-category-12)
import type {ReactNode} from 'react';
import Link from 'next/link';
import {ArrowRightIcon, PackageIcon} from 'lucide-react';

import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';

export type ProductCard = {
    img: string;
    title: string;
    productLink: string;
    icon: ReactNode;
    discountNumber?: number;
    newArrival?: boolean;
};

export type ProductCategoryProps = {
    productCards: ProductCard[];
    exploreAllHref?: string;
    className?: string;
};

const ProductCategory = ({
    productCards,
    exploreAllHref,
    className,
}: ProductCategoryProps) => {
    return (
        <section className={cn('bg-background', className)}>
            <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
                {exploreAllHref ? (
                    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                        <h2 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                            Collections
                        </h2>
                        <Link
                            href={exploreAllHref}
                            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                        >
                            Explore all products
                            <ArrowRightIcon className="size-4" />
                        </Link>
                    </div>
                ) : (
                    <h2 className="text-foreground mb-8 text-2xl font-bold tracking-tight md:text-3xl">
                        Collections
                    </h2>
                )}

                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {productCards.map((card) => (
                        <li key={`${card.productLink}-${card.title}`}>
                            <Link
                                href={card.productLink}
                                className="group bg-muted/40 hover:bg-muted/60 flex h-full flex-col overflow-hidden rounded-xl border border-transparent transition-colors"
                            >
                                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#ececec]">
                                    {card.img ? (
                                        <img
                                            src={card.img}
                                            alt=""
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <PackageIcon className="text-muted-foreground size-12 opacity-40" />
                                        </div>
                                    )}
                                    {typeof card.discountNumber === 'number' ? (
                                        <Badge
                                            className="absolute top-3 left-3 font-semibold"
                                            variant="destructive"
                                        >
                                            {card.discountNumber}% off
                                        </Badge>
                                    ) : null}
                                    {card.newArrival ? (
                                        <Badge className="absolute top-3 right-3 font-semibold">
                                            New
                                        </Badge>
                                    ) : null}
                                </div>
                                <div className="flex flex-1 flex-col gap-3 p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-muted-foreground mt-0.5 shrink-0">
                                            {card.icon}
                                        </span>
                                        <span className="text-foreground group-hover:text-primary line-clamp-2 text-base font-semibold leading-snug transition-colors">
                                            {card.title}
                                        </span>
                                    </div>
                                    <span className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
                                        View collection
                                        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default ProductCategory;
