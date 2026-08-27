import type {Metadata} from 'next';
import {ExpressEntry} from '@/components/request/express-entry';

export const metadata: Metadata = {
    title: 'Get a quote',
    robots: {index: false, follow: false},
};

export default function RequestExpressPage() {
    return <ExpressEntry />;
}
