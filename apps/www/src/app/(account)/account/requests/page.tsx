import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES, accountRequestHref} from '@/lib/www-routes';
import {listBuyerRequests} from '@/lib/account/buyer-requests';

export const metadata = {
    title: 'Requests',
    robots: {index: false, follow: false},
};

/** Rendered per request — the list is the buyer's own data behind RLS, and a
 *  cached page would serve one buyer's requests to the next. */
export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default async function AccountRequestsPage() {
    // The auth gate lives in (account)/layout.tsx, so a guest never reaches this.
    const requests = await listBuyerRequests();

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <PageHeadingSection
                variant="compact"
                title={ACCOUNT_COPY.requestsTitle}
                className="px-0 sm:px-0 md:px-0"
                innerClassName="border-x-0 px-0 pb-0 pt-0 md:px-0"
            />

            {requests.length === 0 ? (
                <>
                    <p className="text-muted-foreground">
                        {ACCOUNT_COPY.requestsEmpty}
                    </p>
                    {/* 🔴 Says why an earlier request may be absent. A buyer who
                        submitted while signed out sees an empty list, and
                        without this reads it as lost data rather than as the
                        deliberate boundary it is. */}
                    <p className="text-sm text-muted-foreground">
                        {ACCOUNT_COPY.requestsGuestNote}
                    </p>
                    <div>
                        <Button asChild className="rounded-sm">
                            <Link href={WWW_ROUTES.request}>
                                {ACCOUNT_COPY.startARequest}
                            </Link>
                        </Button>
                    </div>
                </>
            ) : (
                <ul className="flex flex-col gap-3">
                    {requests.map((request) => (
                        <li key={request.id}>
                            <Link
                                href={accountRequestHref(request.id)}
                                className="flex flex-col gap-1 rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
                            >
                                <span className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="font-medium text-foreground">
                                        {request.reference}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(request.submittedAt)}
                                    </span>
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {request.summary}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
