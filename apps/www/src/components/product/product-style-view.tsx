import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingWithMedia} from '@/components/common/page-heading-section';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {resolveStyleCardImage} from '@/lib/catalog/product-line-landing';
import type {
    ProductLibraryResult,
    ProductLine,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

/**
 * Breadcrumb + heading for a product style landing — available once
 * `getStyle` resolves; the library grid can load after.
 */
export function ProductStyleChrome({
    line,
    style,
}: {
    line: ProductLine;
    style: ProductStyleRef;
}) {
    const description =
        style.shortDescription?.trim() ||
        style.description?.trim() ||
        undefined;
    const {imageUrl, imageAlt} = resolveStyleCardImage(style, line);

    return (
        <>
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
        </>
    );
}

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
    return (
        <>
            <ProductStyleChrome line={line} style={style} />
            <ProductCatalogView
                library={library}
                urlSync
                showPageChrome={false}
                hideCatalogBorderTop
            />
        </>
    );
}
