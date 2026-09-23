import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ExpertiseStageShellView} from '@/components/expertise/expertise-views';
import {
    getExpertiseStage,
    listExpertiseStageSlugs,
} from '@/lib/expertise/expertise';
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
    const stage = await getExpertiseStage(slug);
    if (!stage) return {title: 'Expertise'};

    const title = stage.metaTitle || stage.h1;
    const description =
        stage.metaDescription || stage.description || undefined;
    const canonical =
        stage.canonicalUrl || absoluteUrl(expertiseHref(stage.slug));
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';

    return {
        title,
        description,
        alternates: {canonical},
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
    const stage = await getExpertiseStage(slug);
    if (!stage) notFound();
    return <ExpertiseStageShellView stage={stage} />;
}
