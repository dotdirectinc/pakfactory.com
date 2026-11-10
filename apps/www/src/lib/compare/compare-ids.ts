import {parseCustomizationBookmarkId} from '@/lib/bookmarks/bookmark-id';

const MAX = 3;

export const COMPARE_CUSTOMIZATION_MAX = MAX;

/** Default visible columns on /compare (empty Add slots included). Hard ceiling is COMPARE_GROUP_LIMIT. */
export const COMPARE_GROUP_MAX = 4;
/** Soft ceiling for any configured max (and for parsing /compare?ids=). */
export const COMPARE_GROUP_LIMIT = 20;

export function buildCompareSearch(ids: string[]): string {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return '';
    return `?ids=${encodeURIComponent(unique.join(','))}`;
}

export function parseCompareIdsParam(raw: string | null | undefined): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(',')
        .map((part) => {
            try {
                return decodeURIComponent(part.trim());
            } catch {
                return part.trim();
            }
        })
        .filter((id) => Boolean(parseCustomizationBookmarkId(id)))
        .slice(0, MAX);
}

/** Parse `/compare?ids=` (comma-separated product slugs or `category/slug`). */
export function parseCompareIds(raw: string | null | undefined): string[] {
    return (raw ?? '')
        .split(',')
        .map((s) => {
            try {
                return decodeURIComponent(s.trim());
            } catch {
                return s.trim();
            }
        })
        .filter(Boolean)
        .slice(0, COMPARE_GROUP_LIMIT);
}

