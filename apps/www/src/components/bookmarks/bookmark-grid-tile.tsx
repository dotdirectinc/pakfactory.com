'use client';

import {Button} from '@pakfactory/ui/components/button';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    CustomizationCard,
    type CustomizationCardData,
} from '@/components/customization/customization-card';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {useQuickConfigure} from '@/components/quick-configure/quick-configure';
import {
    type BookmarkEntry,
    parseCustomizationBookmarkId,
} from '@/lib/bookmarks/bookmarks';
import {labelFromSlug} from '@/lib/compare/compare-set';
import {stopCardAction} from '@/lib/catalog-card-actions';

function selectionKey(entry: BookmarkEntry): string {
    return `${entry.type}:${entry.id}`;
}

function toProductCardData(entry: BookmarkEntry): ProductCardData {
    const snap = entry.snapshot;
    return {
        title: snap.title,
        href: snap.href,
        slug: entry.id,
        ...(snap.sku ? {sku: snap.sku} : {}),
        ...(snap.imageUrl
            ? {imageUrl: snap.imageUrl, imageAlt: snap.imageAlt ?? snap.title}
            : {}),
        ...(snap.productLineSlug && snap.productLineTitle
            ? {
                  productLine: {
                      slug: snap.productLineSlug,
                      title: snap.productLineTitle,
                  },
              }
            : snap.productLineTitle
              ? {supportNote: snap.productLineTitle}
              : {}),
        ...(snap.moq != null ? {moq: snap.moq} : {}),
    };
}

function slugFromHref(href: string): string {
    const pathOnly = href.split('?')[0] ?? '';
    return pathOnly.split('/').filter(Boolean).pop() ?? '';
}

function toCustomizationCardData(
    entry: BookmarkEntry,
): CustomizationCardData | null {
    const snap = entry.snapshot;
    const parsed = parseCustomizationBookmarkId(entry.id);
    const categoryValue =
        parsed?.category?.trim() || snap.categoryValue?.trim() || '';
    const slug =
        parsed?.slug?.trim() ||
        snap.typeSlug?.trim() ||
        slugFromHref(snap.href);
    if (!categoryValue || !slug) return null;

    return {
        _id: entry.id,
        title: snap.title,
        shortName: snap.title,
        slug,
        categoryValue,
        categoryLabel: labelFromSlug(categoryValue),
        ...(snap.typeTitle ? {typeTitle: snap.typeTitle} : {}),
        ...(snap.typeSlug ? {typeSlug: snap.typeSlug} : {}),
        ...(snap.imageUrl
            ? {
                  imageUrl: snap.imageUrl,
                  imageAlt: snap.imageAlt ?? snap.title,
              }
            : {}),
    };
}

type BookmarkGridTileProps = {
    entry: BookmarkEntry;
    selected: boolean;
    onToggleSelect: () => void;
    onApplyCustomization: () => void;
    className?: string;
};

/**
 * Bookmarks grid tile — composes {@link ProductCard} / {@link CustomizationCard}
 * with selection + Add to Quote / Apply chrome (no parallel card chrome).
 */
export function BookmarkGridTile({
    entry,
    selected,
    onToggleSelect,
    onApplyCustomization,
    className,
}: BookmarkGridTileProps) {
    const quick = useQuickConfigure();
    const key = selectionKey(entry);
    const snap = entry.snapshot;

    const selectionControl = (
        <label
            className="absolute top-3 left-3 z-20 flex cursor-pointer items-center"
            htmlFor={`bm-select-${key}`}
            onClick={(event) => event.stopPropagation()}
        >
            <Checkbox
                id={`bm-select-${key}`}
                checked={selected}
                onCheckedChange={() => onToggleSelect()}
                aria-label={`Select ${snap.title}`}
                className="size-5 [&_svg]:size-3.5"
            />
        </label>
    );

    const showQuickAdd =
        entry.type === 'product' && quick.enabled && Boolean(entry.id);
    const showApply = entry.type === 'customization';

    const metaFooter =
        showQuickAdd || showApply ? (
            <>
                {showQuickAdd ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:sm:opacity-100"
                        onClick={(event) => {
                            stopCardAction(event);
                            quick.open({
                                slug: entry.id,
                                title: snap.title,
                            });
                        }}
                    >
                        Add to Quote
                    </Button>
                ) : null}
                {showApply ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:sm:opacity-100"
                        onClick={(event) => {
                            stopCardAction(event);
                            onApplyCustomization();
                        }}
                    >
                        Apply to a product
                    </Button>
                ) : null}
            </>
        ) : null;

    if (entry.type === 'product') {
        return (
            <li className={cn('min-h-0 h-full', className)}>
                <ProductCard
                    data={toProductCardData(entry)}
                    applyWatermark={false}
                    mediaAccessory={selectionControl}
                    metaFooter={metaFooter}
                />
            </li>
        );
    }

    const customizationData = toCustomizationCardData(entry);
    if (!customizationData) {
        return null;
    }

    return (
        <li className={cn('min-h-0 h-full', className)}>
            <CustomizationCard
                item={customizationData}
                mediaAccessory={selectionControl}
                metaFooter={metaFooter}
            />
        </li>
    );
}
