import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingWithMedia} from '@/components/common/page-heading-section';
import {PageEnter} from '@/components/layout/page-enter';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {resolveStyleCardImage} from '@/lib/catalog/product-line-landing';
import type {
    ProductLibraryResult,
    ProductLine,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

/**
 * Product style landing — same shape as the solution style catalog page:
 * breadcrumb, heading with optional media, then the faceted product library
 * scoped to this line and style.
 */
export function ProductStyleView({
    line,
    style,
    library,
}: {
    line: ProductLine;
    style: ProductStyleRef;
    library: ProductLibraryResult;
}) {
    const description =
        style.shortDescription?.trim() ||
        style.description?.trim() ||
        undefined;
    const {imageUrl, imageAlt} = resolveStyleCardImage(style, line);

    return (
        <PageEnter>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title, href: productHref(line.slug)},
                    {label: style.title},
                ]}
            />
            <PageHeadingWithMedia
                title={style.title}
                description={description}
                media={
                    imageUrl
                        ? {
                              src: imageUrl,
                              alt: imageAlt,
                          }
                        : null
                }
            />
            <ProductCatalogView
                library={library}
                urlSync
                showPageChrome={false}
                hideCatalogBorderTop
            />
        </PageEnter>
    );
}
