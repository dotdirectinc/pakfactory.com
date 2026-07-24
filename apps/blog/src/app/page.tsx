import type { Metadata } from "next";
import { blog } from "@pakfactory/seo";
import { cn } from "@pakfactory/ui/lib/utils";
import { pageDielineOuterClass } from "@/components/layout/page-dieline-section";
import { JsonLdScript } from "@/components/ui/json-ld-script";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import {
  buildBlogHomeMetadata,
  fetchBlogHomePage,
  getBlogHomeDebugInfo,
  resolveHomePageH1,
} from "@/lib/blog-home";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import {
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { buildHomeVideoObjectNodes } from "@/lib/home-jsonld";
import { getListingRobotsFromSearchParams } from "@/lib/seo";
import { siteBaseUrl } from "@/lib/site";

export const revalidate = 60;

const HOME_DESCRIPTION_FALLBACK =
    'Curated packaging insights across trends, sustainability, business strategy, design, and industry news from PakFactory.';

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const sp = await searchParams;
    const directive = getListingRobotsFromSearchParams('blog_index', sp);
    const home = await fetchBlogHomePage();
    return buildBlogHomeMetadata(home, directive);
}

export default async function BlogHomePage() {
    const debug = getBlogHomeDebugInfo();
    const [home, settings] = await Promise.all([
        fetchBlogHomePage(),
        fetchBlogGlobalSettings(),
    ]);
    const blocks = home?.pageBuilder ?? [];
    const pageH1 = resolveHomePageH1(home, settings);
    const showDevEmptyHint =
        process.env.NODE_ENV === 'development' && blocks.length === 0;

    const siteUrl = siteBaseUrl();
    const { org, orgId } = pakfactoryOrganization();
    const blogId = `${siteUrl}#blog`;
    const blogDescription =
        home?.metaDescription?.trim() || HOME_DESCRIPTION_FALLBACK;

    const jsonLd = serializeBlogJsonLd([
        org,
        blog({
            name: pageH1,
            url: siteUrl,
            description: blogDescription,
            id: blogId,
            publisher: { "@id": orgId },
        }),
        ...buildHomeVideoObjectNodes(blocks),
    ]);

    return (
        <>
            <JsonLdScript jsonLd={jsonLd} />
            <main className={cn("overflow-x-clip", pageDielineOuterClass())}>
                <h1 className="sr-only">{pageH1}</h1>
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
