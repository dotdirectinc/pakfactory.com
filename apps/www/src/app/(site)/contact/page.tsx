import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Contact');

export default function ContactPage() {
    return (
        <ComingSoonPage
            title="Contact"
            note="Reserved page for contact. Content is coming soon."
        />
    );
}
