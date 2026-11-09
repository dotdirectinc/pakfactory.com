import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {RequestSubmittedV2Entry} from '@/components/request-v2/request-v2-entry';
import {RFQ_V2_ENABLED} from '@/lib/request-v2/flag';
import {RFQ_REF_PATTERN} from '@/lib/request/contract.rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';
import {isViewerSignedIn} from '@/lib/request/viewer-signed-in';

export const metadata: Metadata = {
    title: 'Quote request submitted',
    robots: {index: false, follow: false},
};

type PageProps = {searchParams: Promise<Record<string, string | string[] | undefined>>};

/** RFQ v2 (prd-website-rfq-v2 §5): the confirmation at /request/{kind}/submitted?ref=…, in the request shell. */
export default async function Page({searchParams}: PageProps) {
    if (!RFQ_V2_ENABLED) notFound();
    const sp = await searchParams;
    const raw = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref;
    const ref = raw && RFQ_REF_PATTERN.test(raw) ? raw : null;
    const [signedIn, serviceOptions] = await Promise.all([isViewerSignedIn(), listRequestServiceOptions()]);
    return <RequestSubmittedV2Entry reference={ref} signedIn={signedIn} serviceOptions={serviceOptions} />;
}
