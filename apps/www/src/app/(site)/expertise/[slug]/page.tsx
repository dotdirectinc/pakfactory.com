import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ExpertiseStageView} from '@/components/expertise/expertise-views';
import {
    fetchDefaultOgImageUrl,
    buildSocialMetadata,
} from '@/lib/case-study-metadata';
import {
    getExpertiseStage,
    listExpertiseStageCards,
    listExpertiseStageSlugs,
} from '@/lib/expertise/expertise';
import {buildExpertiseStageJsonLd} from '@/lib/expertise/expertise-jsonld';
import {absoluteUrl} from '@/lib/site';
import {expertiseHref} from '@/lib/www-routes';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    const pages = await listExpertiseStageSlugs();
    return pages
        .map((page) => page.slug?.trim())
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => ({slug}));
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const [stage, defaultOgImageUrl] = await Promise.all([
        getExpertiseStage(slug),
        fetchDefaultOgImageUrl(),
    ]);
    if (!stage) return {title: 'Expertise'};

    const title = stage.metaTitle || stage.h1;
    const description =
        stage.metaDescription || stage.description || undefined;
    const canonical =
        stage.canonicalUrl || absoluteUrl(expertiseHref(stage.slug));
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';
    // OG image: stage social image → stage diagram → Global Settings default.
    const ogImageUrl =
        stage.ogImageUrl ||
        stage.diagramUrl ||
        defaultOgImageUrl ||
        undefined;
    const ogDescription = stage.ogDescription || description;

    return {
        title,
        description,
        alternates: {canonical},
        ...buildSocialMetadata({
            title: stage.ogTitle || title,
            ...(ogDescription ? {description: ogDescription} : {}),
            canonical,
            openGraphType: 'website',
            ...(ogImageUrl ? {ogImageUrl} : {}),
        }),
        robots: {
            index: !globalNoIndex && stage.allowIndex,
            follow: stage.allowFollow,
            nocache: false,
            googleBot: {
                index: !globalNoIndex && stage.allowIndex,
                follow: stage.allowFollow,
                'max-image-preview': stage.noImageIndex ? 'none' : 'large',
            },
        },
    };
}

export default async function ExpertiseStagePage({params}: PageProps) {
    const {slug} = await params;
    const [stage, orderedStages] = await Promise.all([
        getExpertiseStage(slug),
        listExpertiseStageCards(),
    ]);
    if (!stage) notFound();
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: buildExpertiseStageJsonLd(stage),
                }}
            />
            <ExpertiseStageView stage={stage} orderedStages={orderedStages} />
        </>
    );
}
