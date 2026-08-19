import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Policies');

export default function PoliciesPage() {
    return (
        <ComingSoonPage
            title="Policies"
            note="Reserved index for policy pages. Content is coming soon."
        />
    );
}
