import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Account');

export default function AccountPage() {
    return (
        <ComingSoonPage
            title="Account"
            note="Reserved page for customer account. Content is coming soon."
        />
    );
}
