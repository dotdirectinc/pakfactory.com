import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {CustomizationDetailView} from '@/components/customization/customization-detail-view';
import type {PageSection} from '@/components/sections/registry';
import {
    getCustomizationDetail,
    getCustomizationDetailPage,
    listCustomizations,
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
    const [result, page] = await Promise.all([
        getCustomizationDetail(category, handle),
        getCustomizationDetailPage(category, handle),
    ]);
    if (!result) {
        notFound();
    }

    const pageSections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <CustomizationDetailView
            detail={result.detail}
            peers={result.peers}
            pageSections={pageSections}
        />
    );
}
