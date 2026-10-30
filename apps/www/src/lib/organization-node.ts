import {organization} from '@pakfactory/seo';

import type {CompanyRecord} from '@/lib/www-global-settings';
import {getSiteUrl} from '@/lib/site';

/**
 * The one `Organization` node a page's `@graph` carries, plus its `@id` so other
 * nodes can point at it (`Product.brand`, `Article.publisher`).
 *
 * 🔴 Returns null without a company record. Nothing invents a company name —
 * the rule `news-jsonld.ts` already follows. A page simply emits one node fewer,
 * and anything that would have pointed at this `@id` omits its property instead
 * of pointing at a node that is not in the graph (PROD-3230).
 */
export function companyOrganizationNode(record: CompanyRecord | null): {
    org: Record<string, unknown>;
    orgId: string;
} | null {
    if (!record) return null;
    const origin = getSiteUrl().replace(/\/+$/, '');
    const orgId = `${origin}#organization`;
    return {
        orgId,
        org: organization({
            id: orgId,
            name: record.name,
            url: origin,
            ...(record.logoUrl ? {logo: record.logoUrl} : {}),
            ...(record.description ? {description: record.description} : {}),
            ...(record.sameAs?.length ? {sameAs: record.sameAs} : {}),
        }),
    };
}
