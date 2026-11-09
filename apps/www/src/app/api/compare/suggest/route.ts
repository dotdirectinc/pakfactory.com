import {NextResponse} from 'next/server';

import {getProduct, listCustomizations, listProducts, listRelatedProductSiblings} from '@/lib/catalog/catalog';
import {customizationCategoryHref, productHref} from '@/lib/www-routes';

/**
 * "Also compare" (compare spec CMP-12, Guided): for a group of one, the 2 closest items to compare
 * next. Products: related styles from the same product line (PC-F6 data); customizations: other
 * options of the same type. GET /api/compare/suggest?kind=product|customization&id=…&exclude=a,b
 * Returns compare-set inputs so the bar can add them directly.
 * `&scope=group`: every item of the same line / option type (the /compare title switcher), up to 60.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') === 'customization' ? 'customization' : 'product';
    const id = (url.searchParams.get('id') ?? '').trim();
    const exclude = new Set((url.searchParams.get('exclude') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    const whole = url.searchParams.get('scope') === 'group';
    if (!whole) exclude.add(id);
    if (!id) return NextResponse.json({items: []});
    try {
        if (kind === 'product') {
            const p = await getProduct(id);
            if (!p) return NextResponse.json({items: []});
            const pool = whole ? await listProducts() : await listRelatedProductSiblings(p);
            const siblings = pool.filter((s) => s.productLine.slug === p.productLine.slug && !exclude.has(s.slug));
            const items = siblings.slice(0, whole ? 60 : 2).map((s) => {
                const shortDescription = s.description?.trim() || undefined;
                return {
                    kind: 'product' as const,
                    id: s.slug,
                    title: s.title,
                    href: productHref(s.slug),
                    imageUrl: s.media?.[0]?.src ?? null,
                    groupKey: s.productLine.slug,
                    groupLabel: s.productLine.title,
                    ...(s.productStyle?.title ? {styleTitle: s.productStyle.title} : {}),
                    ...(s.kind === 'inspiration' ? {inspiration: true} : {}),
                    ...(shortDescription ? {shortDescription} : {}),
                };
            });
            return NextResponse.json({items});
        }
        const [category] = id.split('/');
        const lib = await listCustomizations();
        const items = lib.items
            .filter((c) => c.categoryValue === category && !exclude.has(`${c.categoryValue}/${c.slug}`))
            .slice(0, whole ? 60 : 2)
            .map((c) => {
                const shortDescription = c.shortDescription?.trim() || undefined;
                return {
                    kind: 'customization' as const,
                    id: `${c.categoryValue}/${c.slug}`,
                    title: c.shortName?.trim() || c.title,
                    href: customizationCategoryHref(c.categoryValue, c.slug),
                    imageUrl: c.featuredImageUrl ?? c.imageUrl ?? null,
                    groupKey: c.categoryValue,
                    groupLabel: c.categoryLabel?.trim() || c.categoryValue,
                    categoryValue: c.categoryValue,
                    ...(c.typeTitle ? {typeTitle: c.typeTitle} : {}),
                    ...(shortDescription ? {shortDescription} : {}),
                };
            });
        return NextResponse.json({items});
    } catch {
        return NextResponse.json({items: []});
    }
}
