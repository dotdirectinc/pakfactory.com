import type {Metadata} from 'next';
import {SolutionCatalogView} from '@/components/solution/solution-views';
import {listSolutionsWithPages} from '@/lib/solutions/solutions';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Solutions',
    description:
        'Browse industry and channel packaging solutions tailored to how you sell.',
};

export default async function SolutionsPage() {
    const solutions = await listSolutionsWithPages();
    return <SolutionCatalogView solutions={solutions} />;
}
