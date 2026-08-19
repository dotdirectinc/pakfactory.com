import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

export const metadata = comingSoonMetadata('Solutions');

export default function SolutionsPage() {
    return (
        <ComingSoonPage
            title="Solutions"
            note="Reserved index for solution landing pages. Content is coming soon."
        />
    );
}
