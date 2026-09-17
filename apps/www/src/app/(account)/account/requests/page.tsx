import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {AccountRequestList} from '@/components/account/account-request-list';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';
import {listBuyerRequests} from '@/lib/account/buyer-requests';

export const metadata = {
    title: 'Your Requests',
    robots: {index: false, follow: false},
};

/** Rendered per request — the list is the buyer's own data behind RLS, and a
 *  cached page would serve one buyer's requests to the next. */
export const dynamic = 'force-dynamic';

export default async function AccountRequestsPage() {
    // The auth gate lives in (account)/layout.tsx, so a guest never reaches this.
    const requests = await listBuyerRequests();

    return (
        <div className="flex w-full flex-col gap-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {ACCOUNT_COPY.requestsTitle}
            </h1>

            {requests.length === 0 ? (
                <>
                    <p className="text-sm text-muted-foreground">
                        {ACCOUNT_COPY.requestsEmpty}
                    </p>
                    <div>
                        <Button asChild>
                            <Link href={WWW_ROUTES.request}>
                                {ACCOUNT_COPY.startARequest}
                            </Link>
                        </Button>
                    </div>
                </>
            ) : (
                <AccountRequestList requests={requests} />
            )}
        </div>
    );
}
