import type {Metadata} from 'next';
import {
    CUSTOMIZATION_CATALOG_PAGE_QUERY,
    type CatalogIndexPageDoc,
} from '@pakfactory/sanity/queries';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {CustomizationCatalogView} from '@/components/customization/customization-catalog-view';
import {listCustomizations} from '@/lib/catalog/catalog';
import {getSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Customizations',
};

async function fetchCustomizationCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        const client = await getSanityClient();
        return await client.fetch<CatalogIndexPageDoc | null>(
            CUSTOMIZATION_CATALOG_PAGE_QUERY,
        );
    } catch {
        return null;
    }
}

export default async function CustomizationsIndexPage({
    searchParams,
}: {
    searchParams: Promise<{category?: string}>;
}) {
    const [{category}, library, page] = await Promise.all([
        searchParams,
        listCustomizations(),
        fetchCustomizationCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <CustomizationCatalogView
                library={library}
                urlSync
                initialCategory={category ?? null}
            />
            <SectionRenderer sections={sections} />
        </>
    );
}
