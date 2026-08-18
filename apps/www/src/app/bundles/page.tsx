import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Bundles');

export default function BundlesPage() {
    return (
        <ComingSoonPage
            title="Bundles"
            note="Reserved index for bundle pages. Content is coming soon."
        />
    );
}
