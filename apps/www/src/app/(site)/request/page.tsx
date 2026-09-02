import type {Metadata} from 'next';
import {YourRequest} from '@/components/request/your-request';
import {comingSoonMetadata} from '@/components/common/coming-soon-page';

export const metadata: Metadata = comingSoonMetadata('Your Request');

export default function RequestPage() {
    return <YourRequest />;
}
