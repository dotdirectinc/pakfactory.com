import {breadcrumbList, jsonLdGraph, serializeJsonLd} from '@pakfactory/seo';

import type {Product} from '@/lib/catalog/types';
import {absoluteUrl} from '@/lib/site';
import {
    productHref,
    productStyleHref,
    solutionHref,
    solutionStyleHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

type Crumb = {label: string; href?: string};

/**
 * Visible PDP breadcrumb trail (Home is stripped by PageBreadcrumbSection).
 * Shared by the chrome and BreadcrumbList JSON-LD (PROD-2763).
 */
export function buildProductDetailBreadcrumbs(product: Product): Crumb[] {
    const {productLine: line, productStyle: style} = product;

    if (product.kind === 'inspiration' && product.breadcrumbParent) {
        const parent = product.breadcrumbParent;
        const crumbs: Crumb[] = [
            {label: parent.title, href: solutionHref(parent.slug)},
        ];
        if (product.breadcrumbStyle) {
            crumbs.push({
                label: product.breadcrumbStyle.title,
                href: solutionStyleHref(
                    parent.slug,
                    product.breadcrumbStyle.slug,
                ),
            });
        }
        crumbs.push({label: product.title});
        return crumbs;
    }

    return [
        {label: 'Products', href: WWW_ROUTES.products},
        {label: line.title, href: productHref(line.slug)},
        {
            label: style.title,
            href: productStyleHref(line.slug, style.slug),
        },
        {label: product.title},
    ];
}

/**
 * BreadcrumbList JSON-LD matching the visible trail (no Home — PROD-2763).
 */
export function buildProductDetailJsonLd(product: Product): string {
    const pageUrl = absoluteUrl(productHref(product.slug));
    const crumbs = buildProductDetailBreadcrumbs(product);
    const items = crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return {
            name: crumb.label,
            url: isLast
                ? pageUrl
                : absoluteUrl(crumb.href ?? productHref(product.slug)),
        };
    });
    return serializeJsonLd(jsonLdGraph([breadcrumbList(items)]));
}
