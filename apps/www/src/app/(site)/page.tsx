import type {Metadata} from 'next';
import {cache} from 'react';
import Link from 'next/link';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {WWW_ROUTES} from '@/lib/www-routes';
import {getSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {HOME_PAGE_QUERY} from '@pakfactory/sanity/queries';
import {Button} from '@pakfactory/ui/components/button';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

type HomeDoc = {
    title?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    sections?: PageSection[] | null;
};

/** Home hero `_type`s (PROD-2666) — each renders the page H1. */
const HERO_SECTION_TYPES = new Set([
    'heroSpotlight',
    'heroSpotlightFullBleed',
    'heroFinder',
    'heroFinderFullscreen',
]);

/** One fetch per request for metadata + page (Studio singleton `homePage`). */
const getHomePage = cache(async (): Promise<HomeDoc | null> => {
    if (!isSanityConfigured()) return null;
    return (await getSanityClient())
        .fetch<HomeDoc | null>(HOME_PAGE_QUERY)
        .catch(() => null);
});

export async function generateMetadata(): Promise<Metadata> {
    const home = await getHomePage();
    if (!home) {
        return {title: 'PakFactory'};
    }
    return {
        title: home.metaTitle?.trim() || home.title?.trim() || 'PakFactory',
        description: home.metaDescription?.trim() || undefined,
    };
}

/**
 * `/` — the Home Page singleton's `sections[]` (PROD-2666). The hero is a
 * section (Spotlight / Full-bleed / Finder); until an editor adds one, a plain
 * heading keeps the page's single H1.
 */
export default async function Home() {
    const home = await getHomePage();
    const sections = home?.sections ?? [];
    const hasHero = sections.some((section) =>
        HERO_SECTION_TYPES.has(section._type),
    );

    return (
        <main className="min-h-screen bg-background">
            {hasHero ? null : (
                <PageHeadingSection
                    title="PakFactory"
                    description="Custom packaging, simplified."
                >
                    <div className="mt-4 flex gap-4">
                        <Button asChild size="lg">
                            <Link href={WWW_ROUTES.products}>Products</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href={WWW_ROUTES.customizations}>
                                Customization
                            </Link>
                        </Button>
                    </div>
                </PageHeadingSection>
            )}
            <SectionRenderer sections={sections} />
        </main>
    );
}
