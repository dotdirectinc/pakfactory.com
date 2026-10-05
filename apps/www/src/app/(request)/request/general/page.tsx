import type {Metadata} from 'next';
import {ExpressEntry} from '@/components/request/express-entry';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Get a quote',
    robots: {index: false, follow: false},
};

export default async function RequestExpressPage() {
    const serviceOptions = await listRequestServiceOptions();
    return <ExpressEntry serviceOptions={serviceOptions} />;
}
