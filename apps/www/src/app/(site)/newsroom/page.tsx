import type {Metadata} from 'next';
import {Suspense} from 'react';

import {
    NEWSROOM_HEADING,
    NEWSROOM_INTRO,
    NewsroomCatalogPageChrome,
    NewsroomCatalogPanelLoading,
} from '@/components/newsroom/newsroom-catalog-page-loading';
import {NewsroomCatalogView} from '@/components/newsroom/newsroom-views';
import {buildSocialMetadata, fetchDefaultOgImageUrl} from '@/lib/case-study-metadata';
import {getNewsroomCatalog} from '@/lib/newsroom/newsroom';
import {absoluteUrl} from '@/lib/site';
import {WWW_ROUTES} from '@/lib/www-routes';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const canonical = absoluteUrl(WWW_ROUTES.newsroom);
    const title = `${NEWSROOM_HEADING} | PakFactory`;
    const defaultOgImageUrl = await fetchDefaultOgImageUrl();
    return {
        title,
        description: NEWSROOM_INTRO,
        alternates: {canonical},
        ...buildSocialMetadata({
            title,
            description: NEWSROOM_INTRO,
            canonical,
            openGraphType: 'website',
            ogImageUrl: defaultOgImageUrl ?? undefined,
        }),
    };
}

async function NewsroomCatalogBody() {
    const catalog = await getNewsroomCatalog();
    return <NewsroomCatalogView catalog={catalog} />;
}

export default function NewsroomPage() {
    return (
        <>
            <NewsroomCatalogPageChrome />
            <Suspense fallback={<NewsroomCatalogPanelLoading />}>
                <NewsroomCatalogBody />
            </Suspense>
        </>
    );
}
