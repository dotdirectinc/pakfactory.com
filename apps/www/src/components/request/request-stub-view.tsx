'use client';

import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {getProduct} from '@/lib/catalog/catalog';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

export function RequestStubView() {
    const {lines, draft} = useRequest();
    const hasProgress =
        lines.length > 0 ||
        Boolean(draft.notes.trim()) ||
        Boolean(draft.contactEmail.trim());

    return (
        <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight">
                {REQUEST_COPY.yourRequestHeading}
            </h1>
            <p className="mt-2 text-muted-foreground">
                {REQUEST_COPY.yourRequestStub}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
                {hasProgress ? (
                    <Button asChild>
                        <Link
                            href={
                                draft.entryKind === 'express'
                                    ? WWW_ROUTES.requestNew
                                    : draft.entryKind === 'services'
                                      ? WWW_ROUTES.requestServices
                                      : WWW_ROUTES.requestBuilder
                            }
                        >
                            {REQUEST_COPY.continueRequest}
                        </Link>
                    </Button>
                ) : null}
                <Button asChild variant={hasProgress ? 'outline' : 'default'}>
                    <Link href={WWW_ROUTES.requestNew}>
                        {REQUEST_COPY.entryExpress}
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={WWW_ROUTES.requestBuilder}>
                        {REQUEST_COPY.entryProducts}
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={WWW_ROUTES.requestServices}>
                        {REQUEST_COPY.entryServices}
                    </Link>
                </Button>
            </div>

            {draft.ref && draft.submittedAt ? (
                <p className="mt-4 text-sm text-muted-foreground">
                    Last submitted: {draft.ref}
                </p>
            ) : null}

            {lines.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">
                    Nothing here yet.{' '}
                    <Link href={WWW_ROUTES.products} className="underline">
                        {REQUEST_COPY.browseProducts}
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
