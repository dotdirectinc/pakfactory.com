import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {NewsroomDetailView} from '@/components/newsroom/newsroom-views';
import {
    buildSocialMetadata,
    fetchDefaultOgImageUrl,
    firstOgImageUrl,
} from '@/lib/case-study-metadata';
import {
    getNewsItemBySlug,
    getPressBoilerplate,
    listNewsSlugs,
} from '@/lib/newsroom/newsroom';
import type {NewsItem} from '@/lib/newsroom/types';
import {absoluteUrl} from '@/lib/site';
import {staticParamsExceptPreview} from '@/lib/static-params';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    return staticParamsExceptPreview(async () =>
        (await listNewsSlugs()).map((slug) => ({slug})),
    );
}

function canonicalFor(item: NewsItem): string {
    return item.seo.canonicalUrl || absoluteUrl(item.href);
}

/** OG / NewsArticle image: SEO image → feature image → video thumb → site default. */
function imageFor(
    item: NewsItem,
    defaultOgImageUrl: string | null,
): string | undefined {
    const hero =
        item.hero?.kind === 'image'
            ? item.hero.src
            : item.hero?.kind === 'video'
              ? item.hero.thumbnailSrc
              : null;
    return firstOgImageUrl(item.seo.ogImageUrl, hero, defaultOgImageUrl);
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const [item, defaultOgImageUrl] = await Promise.all([
        getNewsItemBySlug(slug),
        fetchDefaultOgImageUrl(),
    ]);
    if (!item) return {title: 'Newsroom'};

    const title = item.seo.metaTitle || item.title;
    const description = item.seo.metaDescription || item.summary || undefined;
    const canonical = canonicalFor(item);
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';
    const index = !globalNoIndex && item.seo.allowIndex;

    return {
        title: `${title} | PakFactory`,
        description,
        alternates: {canonical},
        robots: {
            index,
            follow: item.seo.allowFollow,
            googleBot: {
                index,
                follow: item.seo.allowFollow,
                'max-image-preview': item.seo.noImageIndex ? 'none' : 'large',
            },
        },
        ...buildSocialMetadata({
            title: item.seo.ogTitle || title,
            description: item.seo.ogDescription || description,
            canonical,
            openGraphType: 'article',
            ogImageUrl: imageFor(item, defaultOgImageUrl),
        }),
    };
}

export default async function NewsroomDetailPage({params}: PageProps) {
    const {slug} = await params;
    const [item, boilerplate, defaultOgImageUrl] = await Promise.all([
        getNewsItemBySlug(slug),
        getPressBoilerplate(),
        fetchDefaultOgImageUrl(),
    ]);
    if (!item) notFound();

    return (
        <NewsroomDetailView
            item={item}
            boilerplate={boilerplate}
            canonicalUrl={canonicalFor(item)}
            imageUrl={imageFor(item, defaultOgImageUrl)}
        />
    );
}
