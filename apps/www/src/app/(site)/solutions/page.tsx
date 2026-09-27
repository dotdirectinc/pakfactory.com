import type {Metadata} from 'next';
import {Suspense} from 'react';

import {
    SolutionCatalogPageChrome,
    SolutionCatalogPanelLoading,
} from '@/components/solution/solution-catalog-page-loading';
import {SolutionCatalogView} from '@/components/solution/solution-views';
import {listSolutionsWithPages} from '@/lib/solutions/solutions';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Solutions',
    description:
        'Browse industry and channel packaging solutions tailored to how you sell.',
};

async function SolutionsCatalogBody() {
    const solutions = await listSolutionsWithPages();
    return <SolutionCatalogView solutions={solutions} showPageChrome={false} />;
}

export default function SolutionsPage() {
    return (
        <>
            <SolutionCatalogPageChrome />
            <Suspense fallback={<SolutionCatalogPanelLoading />}>
                <SolutionsCatalogBody />
            </Suspense>
        </>
    );
}
