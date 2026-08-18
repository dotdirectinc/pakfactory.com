import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Expertise');

export default function ExpertisePage() {
    return (
        <ComingSoonPage
            title="Expertise"
            note="Reserved page for packaging expertise. Content is coming soon."
        />
    );
}
