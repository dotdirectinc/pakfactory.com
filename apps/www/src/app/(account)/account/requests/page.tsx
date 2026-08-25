import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

export const metadata = comingSoonMetadata('Requests');

export default function AccountRequestsPage() {
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">
                {ACCOUNT_COPY.requestsTitle}
            </h1>
            <p className="text-muted-foreground">{ACCOUNT_COPY.requestsEmpty}</p>
            <div>
                <Button asChild className="rounded-sm">
                    <Link href={WWW_ROUTES.request}>
                        {ACCOUNT_COPY.startARequest}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
