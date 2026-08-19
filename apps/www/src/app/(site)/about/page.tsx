import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('About');

export default function AboutPage() {
    return (
        <ComingSoonPage
            title="About"
            note="Reserved page for the About story. Content is coming soon."
        />
    );
}
