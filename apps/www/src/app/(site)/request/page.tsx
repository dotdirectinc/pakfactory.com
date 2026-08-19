import type {Metadata} from 'next';
import {RequestStubView} from '@/components/request/request-stub-view';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';

export const metadata: Metadata = comingSoonMetadata('Your Request');

export default function RequestPage() {
    return <RequestStubView />;
}
