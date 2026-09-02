'use client';

import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {getProduct} from '@/lib/catalog/catalog';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestLine} from '@/lib/request/request.storage';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

type StepProductsProps = {
    lines: RequestLine[];
    onRemove: (lineId: string) => void;
    sectionRef?: React.Ref<HTMLElement>;
    /** Skip outer section + title (services-entry products upsell). */
    embedded?: boolean;
};

export function StepProducts({
    lines,
    onRemove,
    sectionRef,
    embedded = false,
}: StepProductsProps) {
    const body = (
        <>
            {embedded ? null : (
                <div className="mb-7">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {REQUEST_COPY.productsTitle}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {REQUEST_COPY.productsSubtitle}
                    </p>
                </div>
            )}

            {lines.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6">
                    <p className="text-sm text-muted-foreground">
                        {REQUEST_COPY.noProductsYet}
                    </p>
                    <Button asChild className="mt-4" variant="outline">
                        <Link href={WWW_ROUTES.products}>
                            {REQUEST_COPY.addProductsCta}
                        </Link>
                    </Button>
                </div>
            ) : (
                <ul className="space-y-3">
                    {lines.map((line) => {
                        const product = getProduct(line.productSlug);
                        const title = product?.title ?? line.productSlug;
                        return (
                            <li
                                key={line.id}
                                className="flex items-start justify-between gap-4 rounded-md border border-border p-4"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold">
                                        <Link
                                            href={productHref(line.productSlug)}
                                            className="hover:underline"
                                        >
                                            {title}
                                        </Link>
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {line.quantities
                                            .map((n) => n.toLocaleString('en-US'))
                                            .join(', ')}{' '}
                                        units
                                        {line.contents ? ` · ${line.contents}` : ''}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(line.id)}
                                >
                                    {REQUEST_COPY.removeLine}
                                </Button>
                            </li>
                        );
                    })}
                    <li>
                        <Button asChild variant="outline" size="sm">
                            <Link href={WWW_ROUTES.products}>
                                {REQUEST_COPY.browseProducts}
                            </Link>
                        </Button>
                    </li>
                </ul>
            )}
        </>
    );

    if (embedded) return <div className="space-y-4">{body}</div>;

    return (
        <section
            id="section-products"
            data-section="products"
            ref={sectionRef}
            className="border-t border-border/60 py-16"
        >
            {body}
        </section>
    );
}
