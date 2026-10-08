import type {Metadata} from 'next';

import {CompatibilityEngine} from '@/components/compatibility/compatibility-engine';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {
    getCustomizationCompatibilityPage,
    listCustomizations,
    listProductLibrary,
    listProductOfferIndex,
} from '@/lib/catalog/catalog';
import {
    packCustomizationLibrary,
    packProductLibrary,
} from '@/lib/catalog/library-wire';
import {packOfferIndex} from '@/lib/catalog/offer-index-wire';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Compatible products',
    robots: {index: false, follow: true},
    alternates: {canonical: '/customizations/compatibility'},
};

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomizationCompatibilityPage({
    searchParams,
}: PageProps) {
    const params = await searchParams;

    const [productLibrary, customizationLibrary, offerIndex, page] =
        await Promise.all([
            listProductLibrary(),
            listCustomizations(),
            listProductOfferIndex(),
            getCustomizationCompatibilityPage(),
        ]);

    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <CompatibilityEngine
            packedProductLibrary={packProductLibrary(productLibrary)}
            packedCustomizationLibrary={packCustomizationLibrary(
                customizationLibrary,
            )}
            packedOfferIndex={packOfferIndex(offerIndex)}
            initialSearchParams={params}
            below={
                sections?.length ? (
                    <SectionRenderer sections={sections} />
                ) : null
            }
        />
    );
}
