import type {Metadata} from 'next';
import {RequestSubmittedEntry} from '@/components/request-sections/request-entry';
import {RFQ_REF_PATTERN} from '@/lib/request/contract.rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';
import {isViewerSignedIn} from '@/lib/request/viewer-signed-in';

export const metadata: Metadata = {
    title: 'Quote request submitted',
    robots: {index: false, follow: false},
};

type PageProps = {searchParams: Promise<Record<string, string | string[] | undefined>>};

/** Confirmation at /request/{kind}/submitted?ref=…, in the request shell. */
export default async function Page({searchParams}: PageProps) {
    const sp = await searchParams;
    const raw = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref;
    const ref = raw && RFQ_REF_PATTERN.test(raw) ? raw : null;
    const [signedIn, serviceOptions] = await Promise.all([isViewerSignedIn(), listRequestServiceOptions()]);
    return <RequestSubmittedEntry reference={ref} signedIn={signedIn} serviceOptions={serviceOptions} />;
}
