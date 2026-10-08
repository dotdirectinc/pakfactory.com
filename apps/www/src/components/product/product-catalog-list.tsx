import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {CatalogEntryCard} from '@/components/product/catalog-entry-card';
import {MediaCardSkeleton} from '@/components/ui/media-card-skeleton';
import type {
    ProductLibraryItem,
    ProductLibraryLineMeta,
} from '@/lib/catalog/types';
import {productHref} from '@/lib/www-routes';

/** 0-based index for the solid catalog entry card (first spot). */
export const CATALOG_ENTRY_CARD_INDEX = 0;

const CATALOG_GRID_CLASS =
    'grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export function toProductLibraryCardData(
    item: ProductLibraryItem,
    href = productHref(item.slug),
): ProductCardData {
    return {
        title: item.title,
        href,
        sku: item.sku,
        eyebrowLabel: item.productStyle.title ?? item.productLine.title,
        imageUrl: item.imageUrl ?? null,
        imageAlt: item.imageAlt ?? item.title,
        images: item.images,
        moq: item.moq,
        ...(item.status ? {status: item.status} : {}),
    };
}

type GridCell =
    | {kind: 'product'; item: ProductLibraryItem}
    | {kind: 'line'; line: ProductLibraryLineMeta};

function buildGridCells(
    items: ProductLibraryItem[],
    lineEntry: ProductLibraryLineMeta | null,
): GridCell[] {
    const cells: GridCell[] = items.map((item) => ({kind: 'product', item}));
    if (!lineEntry) return cells;
    const index = Math.min(CATALOG_ENTRY_CARD_INDEX, cells.length);
    cells.splice(index, 0, {kind: 'line', line: lineEntry});
    return cells;
}

export type ProductCatalogCardMeta = {
    badge?: string | null;
    note?: string | null;
};

type ProductCatalogListProps = {
    items: ProductLibraryItem[];
    /** When set, spliced at the first grid spot. */
    lineEntry?: ProductLibraryLineMeta | null;
    emptyMessage?: string;
    /**
     * Query string (no `?`) appended to product card hrefs — serializable for
     * RSC → client (compatibility handoff).
     */
    productHrefQuery?: string;
    /** Per-product badge / note keyed by `_id` (serializable). */
    cardMetaByProductId?: Record<string, ProductCatalogCardMeta>;
};

export function ProductCatalogList({
    items,
    lineEntry = null,
    emptyMessage = 'No products match these filters. Reset or broaden search.',
    productHrefQuery,
    cardMetaByProductId,
}: ProductCatalogListProps) {
    const cells = buildGridCells(items, lineEntry);
    const hrefFor = (slug: string) => {
        const base = productHref(slug);
        return productHrefQuery ? `${base}?${productHrefQuery}` : base;
    };

    if (cells.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={CATALOG_GRID_CLASS}>
            {cells.map((cell, index) => {
                if (cell.kind === 'line') {
                    return (
                        <div
                            key={`line-entry-${cell.line.slug}`}
                            className="min-h-0 h-full"
                        >
                            <CatalogEntryCard
                                title={cell.line.title}
                                href={productHref(cell.line.slug)}
                                imageUrl={cell.line.imageUrl}
                                imageAlt={cell.line.imageAlt ?? cell.line.title}
                            />
                        </div>
                    );
                }
                const meta = cardMetaByProductId?.[cell.item._id];
                return (
                    <div key={cell.item._id} className="min-h-0 h-full">
                        <ProductCard
                            data={{
                                ...toProductLibraryCardData(
                                    cell.item,
                                    hrefFor(cell.item.slug),
                                ),
                                ...(meta?.badge
                                    ? {
                                          mediaBadgeLabel:
                                              meta.badge ?? undefined,
                                      }
                                    : {}),
                                ...(meta?.note
                                    ? {
                                          supportNote: meta.note ?? undefined,
                                      }
                                    : {}),
                            }}
                            priority={index < 4}
                            applyWatermark={false}
                        />
                    </div>
                );
            })}
        </div>
    );
}

type ProductCatalogListSkeletonProps = {
    count?: number;
};

export function ProductCatalogListSkeleton({
    count = 12,
}: ProductCatalogListSkeletonProps) {
    return (
        <div
            className={CATALOG_GRID_CLASS}
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading products</span>
            {Array.from({length: count}, (_, index) => (
                <div key={index} className="min-h-0 h-full">
                    <MediaCardSkeleton className="h-full" />
                </div>
            ))}
        </div>
    );
}
