import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {CustomizationDetailView} from '@/components/customization/customization-detail-view';
import type {PageSection} from '@/components/sections/registry';
import {buildWorksWithProducts} from '@/lib/catalog/build-works-with-products';
import {
    getCustomizationDetail,
    getCustomizationDetailPage,
    listCustomizations,
    listProductLibrary,
    listProductOfferIndex,
} from '@/lib/catalog/catalog';

export const revalidate = 60;

type PageParams = {category: string; handle: string};

export async function generateStaticParams(): Promise<PageParams[]> {
    const {items} = await listCustomizations();
    return items.map((item) => ({
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
    const result = await getCustomizationDetail(category, handle);
    if (!result) {
        notFound();
    }
    return {
        title: result.detail.title,
        ...(result.detail.metaDescription || result.detail.description
            ? {
                  description:
                      result.detail.metaDescription ||
                      result.detail.description,
              }
            : {}),
    };
}

export default async function CustomizationDetailPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const {category, handle} = await params;
    const [result, page, productLibrary, offerIndex] = await Promise.all([
        getCustomizationDetail(category, handle),
        getCustomizationDetailPage(category, handle),
        listProductLibrary(),
        listProductOfferIndex(),
    ]);
    if (!result) {
        notFound();
    }

    const pageSections = (page?.sections ?? null) as PageSection[] | null;
    const {products: worksWithProducts, lines: worksWithLines} =
        buildWorksWithProducts({
            optionId: result.detail.id,
            productLibrary,
            offerIndex,
            preferredLines: result.detail.productLines,
        });

    return (
        <CustomizationDetailView
            detail={result.detail}
            peers={result.peers}
            pageSections={pageSections}
            worksWith={{
                option: {
                    id: result.detail.id,
                    category: result.detail.categoryValue,
                    slug: result.detail.slug,
                    title: result.detail.title,
                },
                lines: worksWithLines,
                products: worksWithProducts,
            }}
        />
    );
}
