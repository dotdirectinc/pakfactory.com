import type {PortableTextBlock} from '@portabletext/types';
import type {Metadata} from 'next';
import Link from 'next/link';
import {PortableText} from '@portabletext/react';
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
        <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight">{headline}</h1>
            {home?.body?.length ? (
                <div className="prose prose-neutral mt-6 max-w-2xl dark:prose-invert">
                    <PortableText value={home.body} />
                </div>
            ) : (
                <p className="mt-4 text-muted-foreground">{sub}</p>
            )}
            <div className="mt-8 flex gap-3">
                <Button asChild size="lg">
                    <Link href="/products">Products</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/capabilities">Capabilities</Link>
                </Button>
            </div>
        </main>
    );
}
