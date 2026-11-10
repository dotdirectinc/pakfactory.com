import type {Metadata} from 'next';
import {RequestRootEntry} from '@/components/request-sections/request-entry';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';

export const metadata: Metadata = comingSoonMetadata('Quote Request');

export default function RequestPage() {
    // /request goes to the items request if there are items, else the general one.
    // Lives in the request shell (no site nav / footer) so the redirect does not flash site chrome.
    return <RequestRootEntry />;
}
