import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    getCustomizationCategory,
    listCustomizationCategories,
} from '@/lib/catalog/catalog';
import {WWW_ROUTES} from '@/lib/www-routes';

export const revalidate = 60;

type PageParams = {category: string; handle: string};

export async function generateStaticParams(): Promise<PageParams[]> {
    const items = await listCustomizationCategories();
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
    const item = await getCustomizationCategory(category, handle);
    if (!item) {
        notFound();
    }
    return {title: item.title};
}

export default async function CustomizationDetailPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const {category, handle} = await params;
    const item = await getCustomizationCategory(category, handle);
    if (!item) {
        notFound();
    }

    const categoryLabel = item.categoryLabel ?? item.categoryValue;

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Customization', href: WWW_ROUTES.customizations},
                    {label: categoryLabel},
                    {label: item.title},
                ]}
            />
            <PageHeadingSection
                eyebrow="Customization"
                title={item.title}
                description="Detail page placeholder."
            />
        </>
    );
}
