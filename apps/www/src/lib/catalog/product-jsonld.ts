import {
    breadcrumbList,
    faqPage,
    jsonLdGraph,
    product as productNode,
    serializeJsonLd,
} from '@pakfactory/seo';

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
 * Dimension range as one readable string, e.g. `20–120 × 20–80 × 10–60 mm`.
 * Returns null when nothing is set, so the property is omitted rather than
 * emitted as an empty or half-formed value.
 */
function dimensionSummary(product: Product): string | null {
    const range = product.dimensionRange;
    if (!range) return null;
    const axis = (min?: number, max?: number): string | null => {
        if (min == null && max == null) return null;
        if (min != null && max != null) {
            return min === max ? `${min}` : `${min}–${max}`;
        }
        return `${min ?? max}`;
    };
    const parts = [
        axis(range.lengthMin, range.lengthMax),
        axis(range.widthMin, range.widthMax),
        axis(range.heightMin, range.heightMax),
        axis(range.diameterMin, range.diameterMax),
    ].filter(Boolean);
    return parts.length ? `${parts.join(' × ')} mm` : null;
}

/**
 * The manufacturing facts a PDP states that schema.org has no property for.
 *
 * ⚠️ Lead time is deliberately absent: `leadTimeBusinessDaysMin/Max` exists in
 * Sanity but is not projected by `CATALOG_PRODUCT_FIELDS`, so there is nothing
 * to read. Add the projection first if it is wanted here.
 */
function productProperties(product: Product): {name: string; value: string}[] {
    const properties: {name: string; value: string}[] = [];
    if (typeof product.moq === 'number') {
        properties.push({
            name: 'Minimum order quantity',
            value: String(product.moq),
        });
    }
    const dimensions = dimensionSummary(product);
    if (dimensions) {
        properties.push({name: 'Dimension range', value: dimensions});
    }
    return properties;
}

/**
 * PDP JSON-LD: the product itself, its breadcrumb trail, and its FAQs.
 *
 * 🔴 Until PROD-2990 step 6 this emitted `BreadcrumbList` alone — a product page
 * that never told Google it was a product, and that rendered FAQs visibly while
 * saying nothing about them.
 *
 * ⚠️ No `brand` yet. It wants an `{"@id"}` pointer at an Organization node, and
 * this builder is handed only the product — adding one means threading Site-wide
 * Settings through the call site. A pointer at a node that is not in the graph
 * is worse than omitting the property, so it is omitted.
 *
 * FAQs are read from the same `product.faqs` the page renders, so the markup
 * cannot claim a question the visitor cannot see — Google requires that, and the
 * extraction mirrors `expertise-jsonld.ts`.
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

    const images = product.media
        .map((slide) => slide.src)
        .filter((src): src is string => Boolean(src));

    const nodes: Record<string, unknown>[] = [
        productNode({
            id: `${pageUrl}#product`,
            name: product.title,
            url: pageUrl,
            ...(product.description ? {description: product.description} : {}),
            ...(images.length ? {image: images} : {}),
            ...(product.sku && product.sku !== '-' ? {sku: product.sku} : {}),
            // Empty on every product today — the synonyms live on Product Style.
            // Plumbed so it starts emitting the moment one is filled in.
            ...(product.alsoKnownAs?.length
                ? {alternateName: product.alsoKnownAs}
                : {}),
            additionalProperty: productProperties(product),
        }),
        breadcrumbList(items),
    ];

    const faqs = (product.faqs ?? [])
        .map((faq) => ({
            question: faq.question?.trim() ?? '',
            answer: faq.answerPlain?.trim() ?? '',
        }))
        .filter((faq) => faq.question && faq.answer);
    const faq = faqPage({items: faqs, id: `${pageUrl}#faq`});
    if (faq) nodes.push(faq);

    return serializeJsonLd(jsonLdGraph(nodes));
}
