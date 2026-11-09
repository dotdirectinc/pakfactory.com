import type {Metadata} from 'next';
import {YourRequest} from '@/components/request/your-request';
import {RequestRootV2Entry} from '@/components/request-v2/request-v2-entry';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';
import {RFQ_V2_ENABLED} from '@/lib/request-v2/flag';

export const metadata: Metadata = comingSoonMetadata('Quote Request');

export default function RequestPage() {
    // RFQ v2 (flag): /request goes to the items request if there are items, else the general one.
    if (RFQ_V2_ENABLED) return <RequestRootV2Entry />;
    return <YourRequest />;
}
