import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

export const metadata = comingSoonMetadata('Quote Requests');

export default function AccountRequestsPage() {
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <PageHeadingSection
                variant="compact"
                title={ACCOUNT_COPY.requestsTitle}
                className="px-0 sm:px-0 md:px-0"
                innerClassName="border-x-0 px-0 pb-0 pt-0 md:px-0"
            />
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
