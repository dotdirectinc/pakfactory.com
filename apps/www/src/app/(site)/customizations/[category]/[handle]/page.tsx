import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {CustomizationDetailView} from '@/components/customization/customization-detail-view';
import {
    getCustomizationDetail,
    listCustomizations,
} from '@/lib/catalog/catalog';
import {staticParamsExceptPreview} from '@/lib/static-params';

export const revalidate = 60;

type PageParams = {category: string; handle: string};

export async function generateStaticParams(): Promise<PageParams[]> {
    return staticParamsExceptPreview(async () => {
        const {items} = await listCustomizations();
        return items.map((item) => ({
            category: item.categoryValue,
            handle: item.slug,
        }));
    });
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

/**
 * Hero (gallery + config) waits only on {@link getCustomizationDetail}.
 * Product library / offer index / layout sections stream in Suspense inside
 * {@link CustomizationDetailView} so catalog → CDP soft-nav is not frozen on
 * those heavy fetches.
 */
export default async function CustomizationDetailPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const {category, handle} = await params;
    const result = await getCustomizationDetail(category, handle);
    if (!result) {
        notFound();
    }

    return (
        <CustomizationDetailView
            detail={result.detail}
            peers={result.peers}
            category={category}
            handle={handle}
        />
    );
}
