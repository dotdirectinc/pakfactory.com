import type {Metadata} from 'next';
import {Suspense} from 'react';

import {CompareView} from '@/components/compare/compare-view';
import {parseCompareIds} from '@/lib/compare/compare-ids';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Compare',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

/**
 * Compare (Website PRD v4.6 R27): thin shell. Heroes come from the visitor's
 * compare set in localStorage; the matrix loads from `/api/compare/matrix`.
 * `/compare?type=products|customizations&ids=…` (`&shared=1` = read-only share).
 */
export default async function ComparePage({
    searchParams,
}: {
    searchParams: Promise<{type?: string; ids?: string; shared?: string}>;
}) {
    const {type: rawType, ids: rawIds, shared} = await searchParams;
    const type = rawType === 'customizations' ? 'customizations' : 'products';
    const ids = parseCompareIds(rawIds);
    return (
        <Suspense fallback={null}>
            <CompareView type={type} ids={ids} shared={shared === '1'} guided />
        </Suspense>
    );
}
