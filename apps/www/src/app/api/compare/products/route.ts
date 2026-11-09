import {NextResponse} from 'next/server';

import {getProduct} from '@/lib/catalog/catalog';

/**
 * Works with cross-check (Website PRD R46): for the products in a visitor's compare set,
 * the customization ids each supports. GET /api/compare/products?ids=slug,slug
 */
export async function GET(req: Request) {
    const ids = (new URL(req.url).searchParams.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);
    const out = await Promise.all(
        ids.map(async (slug) => {
            const p = await getProduct(slug);
            return p
                ? {slug, title: p.title, lineSlug: p.productLine.slug, imageUrl: p.media?.[0]?.src ?? null, lineTitle: p.productLine.title, available: (p.availableCustomizations ?? []).filter((o) => o.slug).map((o) => `${o.category}/${o.slug}`)}
                : null;
        }),
    );
    return NextResponse.json({products: out.filter(Boolean)});
}
