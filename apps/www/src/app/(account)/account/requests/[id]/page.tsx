import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';
import {getBuyerRequest} from '@/lib/account/buyer-requests';

export const metadata = {
    title: 'Request',
    robots: {index: false, follow: false},
};

export const dynamic = 'force-dynamic';

type AccountRequestDetailPageProps = {
    params: Promise<{id: string}>;
};

function Row({label, value}: {label: string; value: string}) {
    if (!value.trim()) return null;
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
        </div>
    );
}

export default async function AccountRequestDetailPage({
    params,
}: AccountRequestDetailPageProps) {
    const {id} = await params;
    const request = await getBuyerRequest(id);

    // Not found and not-yours are the same answer on purpose: distinguishing them
    // would confirm that another buyer's request exists.
    if (!request) notFound();

    const quantities = request.quantities.length
        ? request.quantities.map((q) => q.toLocaleString('en-US')).join(' · ')
        : '';

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <div className="flex flex-col gap-2">
                <Link
                    href={WWW_ROUTES.accountRequests}
                    className="text-sm text-muted-foreground underline underline-offset-4"
                >
                    {ACCOUNT_COPY.backToRequests}
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">
                    {request.reference}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {ACCOUNT_COPY.submittedOn(
                        new Date(request.submittedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        }),
                    )}
                </p>
            </div>

            {/* Deliberately no status. `rfq.status` is only ever 'submitted' —
                nothing sets 'quoted' or 'ordered' yet — so showing it would
                promise progress tracking that does not exist. */}

            <dl className="flex flex-col gap-3">
                <Row label={ACCOUNT_COPY.fieldContents} value={request.packagingContents} />
                <Row label={ACCOUNT_COPY.fieldQuantity} value={quantities} />
                <Row label={ACCOUNT_COPY.fieldTimeline} value={request.timeline} />
                <Row label={ACCOUNT_COPY.fieldShipTo} value={request.shipTo} />
                <Row label={ACCOUNT_COPY.fieldNotes} value={request.notes} />
            </dl>

            {request.lines.length > 0 ? (
                <section className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold">{ACCOUNT_COPY.itemsHeading}</h2>
                    <ul className="flex flex-col gap-3">
                        {request.lines.map((line) => (
                            <li
                                key={line.id}
                                className="flex flex-col gap-1 rounded-md border border-border p-4"
                            >
                                <span className="font-medium text-foreground">
                                    {line.productSlug}
                                </span>
                                <dl className="flex flex-col gap-1">
                                    <Row label={ACCOUNT_COPY.fieldContents} value={line.contents} />
                                    <Row
                                        label={ACCOUNT_COPY.fieldQuantity}
                                        value={line.quantities
                                            .map((q) => q.toLocaleString('en-US'))
                                            .join(' · ')}
                                    />
                                    <Row
                                        label={ACCOUNT_COPY.fieldCustomizations}
                                        value={line.customizations.join(' · ')}
                                    />
                                </dl>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {request.fileNames.length > 0 ? (
                <section className="flex flex-col gap-2">
                    <h2 className="text-sm font-semibold">{ACCOUNT_COPY.filesHeading}</h2>
                    {/* Names only, and not links. A buyer has no authorised route
                        to the bytes — the serving route is staff-only — and an S3
                        URL is what ADR-0013 D3 rules out. */}
                    <ul className="flex flex-col gap-0.5">
                        {request.fileNames.map((name) => (
                            <li key={name} className="text-sm text-muted-foreground">
                                {name}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
