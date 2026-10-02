import type {
    CatalogLifecycle,
    CustomizationLibraryItem,
    CustomizationLibraryResult,
    ProductKind,
    ProductLibraryItem,
    ProductLibraryResult,
    ProductLineRef,
} from '@/lib/catalog/types';

/**
 * Compact wire format for the catalog libraries passed from the server views
 * to the client panels (PROD-2757).
 *
 * The full library is serialized into the RSC payload ahead of the streamed
 * grid HTML, so every byte delays the first card. Items repeat the same line,
 * style and industry objects and the same title maps; the wire form indexes
 * those into shared tables and sends products as positional tuples. Panels
 * call `unpack*` once and work with the normal `*LibraryItem` shapes, so
 * filters, cards and other consumers are unchanged.
 */

/** `[slug, title]` — one row per distinct line / style / industry. */
type RefRow = [slug: string, title: string];

const PRODUCT_KINDS: ProductKind[] = ['standard', 'inspiration'];

/**
 * Positional product row. Absent optional fields are `null`; trailing nulls
 * are trimmed. `imageUrl` restores as `null` when absent (map-sanity always
 * sets it; cards read `imageUrl ?? null`). `imageAlt`: `null` = same as
 * title (1231/1236 on staging), `0` = absent, otherwise the string.
 */
type PackedProductItem = [
    id: string,
    title: string,
    slug: string,
    sku: string,
    kind: number,
    line: number,
    style: number,
    imageUrl?: string | null,
    imageAlt?: string | 0 | null,
    moq?: number | null,
    status?: CatalogLifecycle | null,
    industries?: number[] | null,
    attrs?: Record<string, string[]> | null,
    images?: {src: string; alt?: string}[] | null,
];

export type PackedProductLibrary = Omit<ProductLibraryResult, 'items'> & {
    lines: RefRow[];
    styles: RefRow[];
    industries: RefRow[];
    items: PackedProductItem[];
};

/** Customization item without its per-item title maps; lines become indexes. */
type PackedCustomizationItem = Omit<
    CustomizationLibraryItem,
    'propertyTitles' | 'valueTitles' | 'productLines'
> & {productLines: number[]};

export type PackedCustomizationLibrary = Omit<
    CustomizationLibraryResult,
    'items'
> & {
    lines: RefRow[];
    /** Union of every item's property.slug → title (titles are per property). */
    propertyTitles: Record<string, string>;
    items: PackedCustomizationItem[];
};

function refTable() {
    const rows: RefRow[] = [];
    const index = new Map<string, number>();
    return {
        rows,
        indexOf(ref: ProductLineRef): number {
            const existing = index.get(ref.slug);
            if (existing !== undefined) return existing;
            index.set(ref.slug, rows.length);
            rows.push([ref.slug, ref.title]);
            return rows.length - 1;
        },
    };
}

function toRef(row: RefRow): ProductLineRef {
    return {slug: row[0], title: row[1]};
}

function isEmptyRecord(value: Record<string, unknown> | undefined): boolean {
    return !value || Object.keys(value).length === 0;
}

export function packProductLibrary(
    library: ProductLibraryResult,
): PackedProductLibrary {
    const lines = refTable();
    const styles = refTable();
    const industries = refTable();

    const items = library.items.map((item): PackedProductItem => {
        const row: PackedProductItem = [
            item._id,
            item.title,
            item.slug,
            item.sku,
            Math.max(0, PRODUCT_KINDS.indexOf(item.kind)),
            lines.indexOf(item.productLine),
            styles.indexOf(item.productStyle),
            item.imageUrl ?? null,
            item.imageAlt === item.title
                ? null
                : item.imageAlt == null
                  ? 0
                  : item.imageAlt,
            item.moq ?? null,
            item.status ?? null,
            item.industries.length > 0
                ? item.industries.map((ref) => industries.indexOf(ref))
                : null,
            isEmptyRecord(item.attrs) ? null : item.attrs,
            item.images?.length ? item.images : null,
        ];
        while (row.length > 7 && row[row.length - 1] === null) row.pop();
        return row;
    });

    const {items: _items, ...rest} = library;
    return {
        ...rest,
        lines: lines.rows,
        styles: styles.rows,
        industries: industries.rows,
        items,
    };
}

export function unpackProductLibrary(
    packed: PackedProductLibrary,
): ProductLibraryResult {
    const {lines, styles, industries, items, ...rest} = packed;
    return {
        ...rest,
        items: items.map((row): ProductLibraryItem => {
            const [
                _id,
                title,
                slug,
                sku,
                kind,
                line,
                style,
                imageUrl = null,
                imageAlt = null,
                moq = null,
                status = null,
                industryIndexes = null,
                attrs = null,
                images = null,
            ] = row;
            return {
                _id,
                title,
                slug,
                sku,
                kind: PRODUCT_KINDS[kind] ?? 'standard',
                productLine: toRef(lines[line]!),
                productStyle: toRef(styles[style]!),
                imageUrl,
                ...(imageAlt === 0
                    ? {}
                    : {imageAlt: imageAlt === null ? title : imageAlt}),
                ...(moq === null ? {} : {moq}),
                ...(status === null ? {} : {status}),
                industries: (industryIndexes ?? []).map((index) =>
                    toRef(industries[index]!),
                ),
                attrs: attrs ?? {},
                ...(images === null ? {} : {images}),
            };
        }),
    };
}

export function packCustomizationLibrary(
    library: CustomizationLibraryResult,
): PackedCustomizationLibrary {
    const lines = refTable();
    const propertyTitles: Record<string, string> = {};

    const items = library.items.map((item): PackedCustomizationItem => {
        const {
            propertyTitles: itemPropertyTitles,
            valueTitles: _valueTitles,
            productLines,
            ...rest
        } = item;
        Object.assign(propertyTitles, itemPropertyTitles);
        return {
            ...rest,
            productLines: productLines.map((ref) => lines.indexOf(ref)),
        };
    });

    const {items: _items, ...rest} = library;
    return {...rest, lines: lines.rows, propertyTitles, items};
}

/**
 * Restores `CustomizationLibraryItem`s. Every item shares one
 * `propertyTitles` map (property titles are per property, so this matches the
 * per-item maps). `valueTitles` comes back empty: it only feeds facet labels,
 * which the server already resolved into `facetCatalog`; no client code reads
 * it.
 */
export function unpackCustomizationLibrary(
    packed: PackedCustomizationLibrary,
): CustomizationLibraryResult {
    const {lines, propertyTitles, items, ...rest} = packed;
    const emptyValueTitles: Record<string, string> = {};
    return {
        ...rest,
        items: items.map((item) => ({
            ...item,
            productLines: item.productLines.map((index) =>
                toRef(lines[index]!),
            ),
            propertyTitles,
            valueTitles: emptyValueTitles,
        })),
    };
}
