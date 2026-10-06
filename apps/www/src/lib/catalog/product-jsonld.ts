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
    // The primary parent is fixed — no fallback (2026-10-06). When it has no page it
    // still names itself, as plain text rather than a link that 404s.
    const links = product.breadcrumbLinks ?? {line: true, style: true, parent: true};

    if (product.kind === 'inspiration' && product.breadcrumbParent) {
        const parent = product.breadcrumbParent;
        const crumbs: Crumb[] = [
            {
                label: parent.title,
                ...(links.parent ? {href: solutionHref(parent.slug)} : {}),
            },
        ];
        // A Solution Style lives under its solution (R1): no parent page, no style page.
        if (product.breadcrumbStyle && links.parent) {
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
        {
            label: line.title,
            ...(links.line ? {href: productHref(line.slug)} : {}),
        },
        {
            label: style.title,
            ...(links.style ? {href: productStyleHref(line.slug, style.slug)} : {}),
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
    // A text-only crumb has no URL to give a ListItem, so it stays out of the markup.
    const linked = crumbs.filter(
        (crumb, index) => crumb.href || index === crumbs.length - 1,
    );
    const items = linked.map((crumb, index) => {
        const isLast = index === linked.length - 1;
        return {
            name: crumb.label,
            url: isLast ? pageUrl : absoluteUrl(crumb.href ?? pageUrl),
        };
    });
    return serializeJsonLd(jsonLdGraph([breadcrumbList(items)]));
}
