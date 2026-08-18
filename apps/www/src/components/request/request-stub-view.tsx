'use client';

import Link from 'next/link';
import {getProduct} from '@/lib/catalog/catalog';
import {useRequest} from '@/lib/request/request-provider';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

export function RequestStubView() {
    const {lines} = useRequest();

    return (
        <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight">Your Request</h1>
            <p className="mt-2 text-muted-foreground">
                Your added products. Full Your Request tools are coming soon.
            </p>
            {lines.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">
                    Nothing here yet.{' '}
                    <Link href={WWW_ROUTES.products} className="underline">
                        Browse products
                    </Link>
                    .
                </p>
            ) : (
                <ul className="mt-8 space-y-4">
                    {lines.map((line) => {
                        const product = getProduct(line.productSlug);
                        const title = product?.title ?? line.productSlug;
                        return (
                            <li
                                key={line.id}
                                className="rounded-xl border border-border p-4"
                            >
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
                                {line.customizations.length > 0 ? (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {line.customizations
                                            .map((item) => item.label)
                                            .join(', ')}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
            <p className="mt-8 text-sm">
                <Link href={WWW_ROUTES.products} className="underline">
                    Keep browsing products
                </Link>
            </p>
        </main>
    );
}
