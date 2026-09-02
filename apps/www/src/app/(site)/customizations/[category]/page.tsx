import type {Metadata} from 'next';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {WWW_ROUTES} from '@/lib/www-routes';

export const metadata: Metadata = {
    title: 'Customization category',
};

export default async function CustomizationCategoryPage({
    params,
}: {
    params: Promise<{category: string}>;
}) {
    const {category} = await params;
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Customization', href: WWW_ROUTES.customizations},
                    {label: category},
                ]}
            />
            <PageHeadingSection
                eyebrow="Customization"
                title={category}
                titleClassName="capitalize"
                description="Landing page placeholder."
            />
        </>
    );
}
