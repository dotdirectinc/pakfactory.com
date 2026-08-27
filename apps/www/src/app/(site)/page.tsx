import type {PortableTextBlock} from '@portabletext/types';
import type {Metadata} from 'next';
import Link from 'next/link';
import {PortableText} from '@portabletext/react';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {WWW_ROUTES} from '@/lib/www-routes';
import {getSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {HOME_PAGE_QUERY} from '@pakfactory/sanity/queries';
import {Button} from '@pakfactory/ui/components/button';

type HomeDoc = {
    title: string;
    heroHeadline?: string;
    body?: PortableTextBlock[];
    seo?: {metaTitle?: string; metaDescription?: string};
};

export async function generateMetadata(): Promise<Metadata> {
    const home = isSanityConfigured()
        ? await (await getSanityClient())
              .fetch<HomeDoc | null>(HOME_PAGE_QUERY)
              .catch(() => null)
        : null;
    if (!home) {
        return {title: 'PakFactory'};
    }
    return {
        title: home.seo?.metaTitle?.trim() || home.title,
        description: home.seo?.metaDescription?.trim(),
    };
}

export default async function Home() {
    const home = isSanityConfigured()
        ? await (await getSanityClient())
              .fetch<HomeDoc | null>(HOME_PAGE_QUERY)
              .catch(() => null)
        : null;

    const headline = home?.heroHeadline?.trim() || home?.title || 'PakFactory';
    const sub = home?.body?.length ? null : 'Custom packaging, simplified.';

    return (
        <main className="min-h-screen bg-background">
            <PageHeadingSection
                title={headline}
                description={
                    home?.body?.length ? (
                        <div className="prose prose-neutral max-w-none dark:prose-invert">
                            <PortableText value={home.body} />
                        </div>
                    ) : (
                        sub
                    )
                }
            >
                <div className="mt-4 flex gap-3">
                    <Button asChild size="lg">
                        <Link href={WWW_ROUTES.products}>Products</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                        <Link href={WWW_ROUTES.capabilities}>Capabilities</Link>
                    </Button>
                </div>
            </PageHeadingSection>
        </main>
    );
}
