/**
 * Compatibility URL contract (PROD-2921).
 *
 * Single source for reading and writing the shareable selection query on
 * `/customizations/compatibility` and `/customizations/[category]/[handle]/compatible`.
 * Do not hand-roll `searchParams.get` for these keys elsewhere.
 *
 * ```
 * ?materials=black-chipboard-pure-black-core
 * &materials.thickness=1.5mm
 * &additional-customization=adhesive-strip,window-patch
 * ```
 */

import {
    PRODUCT_CATALOG_INDUSTRY_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID,
} from '@/lib/catalog/types';

/** Reserved path segment — must never be a customization category slug. */
export const COMPATIBILITY_RESERVED_CATEGORY_SLUG = 'compatibility';

/** Catalog facet / search keys that must not collide with category slugs. */
export const COMPATIBILITY_RESERVED_CATALOG_KEYS = [
    'q',
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID,
    PRODUCT_CATALOG_INDUSTRY_FACET_ID,
] as const;

const VARIANT_KEY = 'variant';

export type CompatibilityPropertySelection = {
    /** Category slug when known; empty on the single-option bare form. */
    category: string;
    /** Option slug when the property key is ambiguous within the category. */
    optionSlug?: string;
    propertyKey: string;
    valueSlugs: string[];
};

export type CompatibilitySelection = {
    category: string;
    optionSlug: string;
};

export type CompatibilityQuery = {
    selections: CompatibilitySelection[];
    properties: CompatibilityPropertySelection[];
    /** Dev-only; never written by serialize / Copy link. */
    variant?: 'a' | 'b';
};

export type ParseCompatibilityQueryOptions = {
    /**
     * Path-supplied primary selection on the single-option route.
     * Bare property params (`?thickness=1.5mm`) attach to this option only.
     */
    pathSelection?: CompatibilitySelection;
};

function parseList(raw: string | null | undefined): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}

function isAttributionKey(key: string): boolean {
    return key === 'ref' || key.startsWith('utm_');
}

function isReservedCatalogKey(key: string): boolean {
    if (
        (COMPATIBILITY_RESERVED_CATALOG_KEYS as readonly string[]).includes(key)
    ) {
        return true;
    }
    return key.startsWith('property.');
}

function compareStrings(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function sortUnique(values: string[]): string[] {
    return [...new Set(values)].sort(compareStrings);
}

/**
 * Assert category slugs never collide with catalog URL keys or the reserved
 * `compatibility` path segment. Call from tests (and once at page load with
 * the live library categories).
 */
export function assertCompatibilityCategorySlugs(
    categorySlugs: Iterable<string>,
): void {
    for (const slug of categorySlugs) {
        const key = slug.trim();
        if (!key) continue;
        if (key === COMPATIBILITY_RESERVED_CATEGORY_SLUG) {
            throw new Error(
                `Customization category slug "${key}" is reserved for /customizations/compatibility.`,
            );
        }
        if (isReservedCatalogKey(key)) {
            throw new Error(
                `Customization category slug "${key}" collides with a products-catalog URL key.`,
            );
        }
    }
}

/**
 * Parse compatibility params from a URLSearchParams (or plain record).
 * Catalog facet keys, `utm_*`, and `ref` are ignored. Unknown property value
 * validation happens later when resolving against the library.
 */
export function parseCompatibilityQuery(
    params: URLSearchParams | Record<string, string | string[] | undefined>,
    options: ParseCompatibilityQueryOptions = {},
): CompatibilityQuery {
    const search =
        params instanceof URLSearchParams
            ? params
            : (() => {
                  const next = new URLSearchParams();
                  for (const [key, value] of Object.entries(params)) {
                      if (value == null) continue;
                      if (Array.isArray(value)) {
                          for (const item of value) next.append(key, item);
                      } else {
                          next.set(key, value);
                      }
                  }
                  return next;
              })();

    const selections: CompatibilitySelection[] = [];
    const properties: CompatibilityPropertySelection[] = [];
    const seenOptions = new Set<string>();

    const addSelection = (category: string, optionSlug: string) => {
        const cat = category.trim();
        const slug = optionSlug.trim();
        if (!cat || !slug) return;
        if (cat === COMPATIBILITY_RESERVED_CATEGORY_SLUG) return;
        if (isReservedCatalogKey(cat)) return;
        const key = `${cat}\0${slug}`;
        if (seenOptions.has(key)) return;
        seenOptions.add(key);
        selections.push({category: cat, optionSlug: slug});
    };

    if (options.pathSelection) {
        addSelection(
            options.pathSelection.category,
            options.pathSelection.optionSlug,
        );
    }

    for (const [rawKey, rawValue] of search.entries()) {
        const key = rawKey.trim();
        if (!key || isAttributionKey(key) || isReservedCatalogKey(key)) {
            continue;
        }
        if (key === VARIANT_KEY) continue;

        const values = parseList(rawValue);
        if (values.length === 0) continue;

        const parts = key.split('.');
        if (parts.length === 1) {
            // Category = options, or bare property on the single-option route.
            const only = parts[0]!;
            if (options.pathSelection && !key.includes('/')) {
                // Bare property keys attach to the path option when that option
                // is present and the key is not itself a category with options.
                // Ambiguity: a category slug with no dots is treated as options
                // unless the path selection's category equals this key (then
                // values are option slugs for that category).
                if (only === options.pathSelection.category) {
                    for (const optionSlug of values) {
                        addSelection(only, optionSlug);
                    }
                    continue;
                }
                // Bare property: ?thickness=1.5mm
                properties.push({
                    category: options.pathSelection.category,
                    optionSlug: options.pathSelection.optionSlug,
                    propertyKey: only,
                    valueSlugs: sortUnique(values),
                });
                continue;
            }
            for (const optionSlug of values) {
                addSelection(only, optionSlug);
            }
            continue;
        }

        if (parts.length === 2) {
            const [category, propertyKey] = parts as [string, string];
            // Could be options for a dotted category (we don't use those) or
            // category.propertyKey. Treat as property when values look like
            // property values — always property form for 2-part keys that are
            // not a reserved catalog key.
            properties.push({
                category: category.trim(),
                propertyKey: propertyKey.trim(),
                valueSlugs: sortUnique(values),
            });
            continue;
        }

        if (parts.length === 3) {
            const [category, optionSlug, propertyKey] = parts as [
                string,
                string,
                string,
            ];
            properties.push({
                category: category.trim(),
                optionSlug: optionSlug.trim(),
                propertyKey: propertyKey.trim(),
                valueSlugs: sortUnique(values),
            });
            addSelection(category, optionSlug);
        }
    }

    selections.sort(
        (a, b) =>
            compareStrings(a.category, b.category) ||
            compareStrings(a.optionSlug, b.optionSlug),
    );

    properties.sort(
        (a, b) =>
            compareStrings(a.category, b.category) ||
            compareStrings(a.optionSlug ?? '', b.optionSlug ?? '') ||
            compareStrings(a.propertyKey, b.propertyKey),
    );

    const variantRaw = search.get(VARIANT_KEY)?.trim().toLowerCase();
    const variant =
        variantRaw === 'a' || variantRaw === 'b' ? variantRaw : undefined;

    return {selections, properties, ...(variant ? {variant} : {})};
}

export type SerializeCompatibilityQueryOptions = {
    /**
     * When set, omit that option from the query (it lives in the path) and
     * emit bare property keys for its properties.
     */
    pathSelection?: CompatibilitySelection;
    /** Include `variant` (tests / deep links only — Copy link must omit). */
    includeVariant?: boolean;
};

/**
 * Canonical serialize. Same selection always yields the same query string.
 * Never writes `utm_*`, `ref`, or (unless asked) `variant`.
 */
export function serializeCompatibilityQuery(
    query: CompatibilityQuery,
    options: SerializeCompatibilityQueryOptions = {},
): string {
    const params = new URLSearchParams();
    const path = options.pathSelection;
    const pathKey = path
        ? `${path.category.trim()}\0${path.optionSlug.trim()}`
        : null;

    const byCategory = new Map<string, string[]>();
    for (const sel of query.selections) {
        const cat = sel.category.trim();
        const slug = sel.optionSlug.trim();
        if (!cat || !slug) continue;
        if (pathKey && `${cat}\0${slug}` === pathKey) continue;
        const list = byCategory.get(cat) ?? [];
        list.push(slug);
        byCategory.set(cat, list);
    }

    const categoryKeys = [...byCategory.keys()].sort(compareStrings);
    for (const category of categoryKeys) {
        const slugs = sortUnique(byCategory.get(category) ?? []);
        if (slugs.length) params.set(category, slugs.join(','));
    }

    // Ambiguous property: same category + propertyKey appears on 2+ options
    // that are selected (or have property rows).
    const propertyOwnerCount = new Map<string, Set<string>>();
    for (const prop of query.properties) {
        const cat = prop.category.trim();
        const pk = prop.propertyKey.trim();
        if (!cat || !pk) continue;
        const mapKey = `${cat}\0${pk}`;
        const owners = propertyOwnerCount.get(mapKey) ?? new Set();
        owners.add(prop.optionSlug?.trim() || '');
        propertyOwnerCount.set(mapKey, owners);
    }
    // Also count selected options in the same category that might share the key
    // when we serialize short form — ambiguous when 2+ selected options in the
    // category and the property does not name an option.
    for (const prop of query.properties) {
        const cat = prop.category.trim();
        const pk = prop.propertyKey.trim();
        if (!cat || !pk) continue;
        const selectedInCat = query.selections
            .filter((s) => s.category === cat)
            .map((s) => s.optionSlug);
        if (selectedInCat.length >= 2 && !prop.optionSlug) {
            const mapKey = `${cat}\0${pk}`;
            const owners = propertyOwnerCount.get(mapKey) ?? new Set();
            for (const slug of selectedInCat) owners.add(slug);
            propertyOwnerCount.set(mapKey, owners);
        }
    }

    const propsSorted = [...query.properties].sort(
        (a, b) =>
            compareStrings(a.category, b.category) ||
            compareStrings(a.optionSlug ?? '', b.optionSlug ?? '') ||
            compareStrings(a.propertyKey, b.propertyKey),
    );

    for (const prop of propsSorted) {
        const cat = prop.category.trim();
        const pk = prop.propertyKey.trim();
        const values = sortUnique(prop.valueSlugs);
        if (!pk || values.length === 0) continue;

        const optionSlug = prop.optionSlug?.trim() || '';
        const isPathProp =
            path &&
            cat === path.category.trim() &&
            (optionSlug === path.optionSlug.trim() || !optionSlug);

        if (isPathProp) {
            params.set(pk, values.join(','));
            continue;
        }

        if (!cat) continue;
        const owners = propertyOwnerCount.get(`${cat}\0${pk}`);
        const ambiguous =
            Boolean(optionSlug) &&
            owners != null &&
            [...owners].filter(Boolean).length >= 2;

        if (ambiguous && optionSlug) {
            params.set(`${cat}.${optionSlug}.${pk}`, values.join(','));
        } else {
            params.set(`${cat}.${pk}`, values.join(','));
        }
    }

    if (options.includeVariant && query.variant) {
        params.set(VARIANT_KEY, query.variant);
    }

    return params.toString();
}

/** Append a serialized query onto a path (no leading `?` when empty). */
export function withCompatibilityQuery(
    path: string,
    query: CompatibilityQuery,
    options?: SerializeCompatibilityQueryOptions,
): string {
    const qs = serializeCompatibilityQuery(query, options);
    if (!qs) return path;
    return `${path}?${qs}`;
}
