import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {CompatibilityEngine} from '@/components/compatibility/compatibility-engine';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {
    getCustomizationCompatibilityPage,
    getCustomizationDetail,
    listCustomizations,
    listProductLibrary,
    listProductOfferIndex,
} from '@/lib/catalog/catalog';
import {COMPATIBILITY_RESERVED_CATEGORY_SLUG} from '@/lib/catalog/compatibility-query';
import {
    packCustomizationLibrary,
    packProductLibrary,
} from '@/lib/catalog/library-wire';
import {packOfferIndex} from '@/lib/catalog/offer-index-wire';

export const revalidate = 60;

type PageParams = {category: string; handle: string};

type PageProps = {
    params: Promise<PageParams>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams(): Promise<PageParams[]> {
    const {items} = await listCustomizations();
    return items
        .filter(
            (item) =>
                item.categoryValue !== COMPATIBILITY_RESERVED_CATEGORY_SLUG,
        )
        .map((item) => ({
            category: item.categoryValue,
            handle: item.slug,
        }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<PageParams>;
}): Promise<Metadata> {
    const {category, handle} = await params;
    if (category === COMPATIBILITY_RESERVED_CATEGORY_SLUG) {
        return {title: 'Compatible products'};
    }
    const result = await getCustomizationDetail(category, handle);
    if (!result) return {title: 'Compatible products'};
    return {
        title: `Compatible with ${result.detail.title}`,
        description: `Packaging products compatible with ${result.detail.title}.`,
        robots: {index: true, follow: true},
        alternates: {
            canonical: `/customizations/${category}/${handle}/compatible`,
        },
    };
}

export default async function CustomizationCompatiblePage({
    params,
    searchParams,
}: PageProps) {
    const {category, handle} = await params;
    if (category === COMPATIBILITY_RESERVED_CATEGORY_SLUG) notFound();
    const query = await searchParams;

    const detail = await getCustomizationDetail(category, handle);
    if (!detail) notFound();

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
            initialSearchParams={query}
            pathSelection={{category, optionSlug: handle}}
            breadcrumbTail={[
                {
                    label: detail.detail.categoryLabel || category,
                    href: `/customizations/${category}`,
                },
                {
                    label: detail.detail.title,
                    href: `/customizations/${category}/${handle}`,
                },
                {label: 'Compatible products'},
            ]}
            below={
                sections?.length ? (
                    <SectionRenderer sections={sections} />
                ) : null
            }
        />
    );
}
