import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ProductCatalogPanelLoading} from '@/components/product/product-catalog-page-loading';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Shown as soon as navigation to the compatibility engine starts, so the URL
 * can change before the product and customization libraries finish loading.
 */
export default function CompatibilityLoading() {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {
                        label: 'Customizations',
                        href: WWW_ROUTES.customizations,
                    },
                    {label: 'Compatibility'},
                ]}
            />
            <PageHeadingSection
                title="Compatible products"
                borderBottom={false}
            />
            <ProductCatalogPanelLoading hideCatalogBorderTop />
        </>
    );
}
