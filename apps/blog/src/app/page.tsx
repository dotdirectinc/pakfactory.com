import type {Metadata} from 'next';
import {
    blog,
    jsonLdGraph,
    organization,
    serializeJsonLd,
} from '@pakfactory/seo';
import {pageDielineOuterClass} from '@/components/layout/page-dieline-section';
import { BlockRenderer } from '@/components/blocks/block-renderer';
import {
    fetchBlogHomePageBuilder,
    getBlogHomeDebugInfo,
} from '@/lib/blog-home';
import {
    getListingRobotsFromSearchParams,
    robotsDirectiveToMetadata,
} from '@/lib/seo';
import {getWwwUrl, normalizeSiteUrl, siteBaseUrl} from '@/lib/site';

export const revalidate = 60;

const HOME_TITLE =
    'PakFactory Blog — Packaging Insights, Trends & Industry News';
const HOME_DESCRIPTION =
    'Curated packaging insights across trends, sustainability, business strategy, design, and industry news from PakFactory.';

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const sp = await searchParams;
    const directive = getListingRobotsFromSearchParams('blog_index', sp);

    return {
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        robots: robotsDirectiveToMetadata(directive),
        openGraph: {
            title: HOME_TITLE,
            description: HOME_DESCRIPTION,
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title: HOME_TITLE,
            description: HOME_DESCRIPTION,
        },
    };
}

export default async function BlogHomePage() {
    const debug = getBlogHomeDebugInfo();
    const blocks = await fetchBlogHomePageBuilder();
    const showDevEmptyHint =
        process.env.NODE_ENV === 'development' && blocks.length === 0;

    const siteUrl = siteBaseUrl();
    const orgId = `${siteUrl}#organization`;
    const blogId = `${siteUrl}#blog`;

    const jsonLd = jsonLdGraph([
        organization({
            name: 'PakFactory',
            url: normalizeSiteUrl(getWwwUrl()),
            id: orgId,
        }),
        blog({
            name: 'PakFactory Blog',
            url: siteUrl,
            description: HOME_DESCRIPTION,
            id: blogId,
            publisher: {'@id': orgId},
        }),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: serializeJsonLd(jsonLd)}}
            />
            <main className={pageDielineOuterClass()}>
                {showDevEmptyHint && (
                    <div
                        className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
                        role="status"
                    >
                        <p className="font-medium">
                            Homepage page builder is empty
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            Project: <code>{debug.projectId}</code> · Dataset:{' '}
                            <code>{debug.dataset}</code> · Token:{' '}
                            {debug.hasReadToken ? 'set' : 'missing'} ·
                            Configured: {debug.configured ? 'yes' : 'no'}
                        </p>
                        <p className="mt-2 text-muted-foreground">
                            Open Studio → Pages → Homepage, or run{' '}
                            <code>pnpm seed:blog-dev</code> on dataset{' '}
                            <code>development</code>.
                        </p>
                    </div>
                )}

                <BlockRenderer blocks={blocks} />
            </main>
        </>
    );
}
