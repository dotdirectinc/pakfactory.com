import {NextResponse} from 'next/server';

import {loadCompareData, parseCompareIds} from '@/lib/compare/load-compare-data';

/**
 * Slim compare matrix (Website PRD R27): GET /api/compare/matrix?type=products|customizations&ids=…
 * Card + properties only — no full PDP / CDP offer resolution.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') === 'customizations' ? 'customizations' : 'products';
    const ids = parseCompareIds(url.searchParams.get('ids'));
    if (!ids.length) {
        return NextResponse.json({data: null});
    }
    try {
        const data = await loadCompareData(type, ids);
        return NextResponse.json({data});
    } catch (err) {
        console.error('[compare/matrix]', err);
        return NextResponse.json({data: null, error: 'compare_matrix_failed'}, {status: 500});
    }
}
