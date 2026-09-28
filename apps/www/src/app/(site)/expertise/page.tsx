import type {Metadata} from 'next';
import {ExpertiseCatalogView} from '@/components/expertise/expertise-views';
import {listExpertiseStageCards} from '@/lib/expertise/expertise';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Expertise',
    description:
        'Packaging expertise across design, prototyping, manufacturing, strategy, logistics, and fulfillment.',
    robots:
        process.env.WWW_DISABLE_INDEXING === 'true'
            ? {index: false, follow: false}
            : {index: true, follow: true},
};

export default async function ExpertisePage() {
    const stages = await listExpertiseStageCards();
    return <ExpertiseCatalogView stages={stages} />;
}
