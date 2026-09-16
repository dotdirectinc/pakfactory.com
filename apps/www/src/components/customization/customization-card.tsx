'use client';

import {useState, type MouseEvent} from 'react';
import Link from 'next/link';
import {Columns2, Package} from 'lucide-react';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {IconActionRow} from '@/components/ui/icon-action-row';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {stubBookmarkAction, stubCompareAction} from '@/lib/catalog-card-actions';
import type {CustomizationLibraryItem} from '@/lib/catalog/types';
import {customizationCategoryHref} from '@/lib/www-routes';

/** Card fields used by the tile (library items are a superset). */
export type CustomizationCardData = Pick<
    CustomizationLibraryItem,
    | '_id'
    | 'title'
    | 'slug'
    | 'categoryValue'
    | 'categoryLabel'
    | 'imageUrl'
    | 'imageAlt'
    | 'images'
>;

type CustomizationCardProps = {
    item: CustomizationCardData;
};

const compareAction = {
    id: 'compare',
    label: 'Compare',
    ariaLabel: 'Compare',
    icon: Columns2,
    onClick: stubCompareAction,
} as const;

function resolveGallery(item: CustomizationCardData) {
    if (item.images && item.images.length > 0) {
        return item.images.filter((img) => Boolean(img.src));
    }
    if (item.imageUrl) {
        return [
            {
                src: item.imageUrl,
                alt: item.imageAlt ?? item.title,
            },
        ];
    }
    return [];
}

/**
 * **Transactional card** — customization catalog tile (category eyebrow, bookmark / compare).
 * Composes {@link MediaCardFrame}.
 */
export function CustomizationCard({item}: CustomizationCardProps) {
    const href = customizationCategoryHref(item.categoryValue, item.slug);
    const eyebrow = (item.categoryLabel ?? item.categoryValue).toUpperCase();
    const [saved, setSaved] = useState(false);
    const gallery = resolveGallery(item);

    function handleBookmark(event: MouseEvent<HTMLButtonElement>) {
        stubBookmarkAction(event);
        setSaved((prev) => !prev);
    }

    const placeholder = (
        <span className="flex size-full items-center justify-center">
            <Icon
                icon={Package}
                className="size-8 text-muted-foreground/50"
            />
        </span>
    );

    const hero = gallery[0];
    const media = hero ? (
        <div className="pointer-events-none absolute inset-0">
            <SanityImage
                src={hero.src}
                alt={hero.alt ?? item.title}
                applyWatermark={false}
                fill
                sizes="(max-width: 640px) 96px, (max-width: 1280px) 33vw, 25vw"
                className="object-cover"
            />
        </div>
    ) : (
        <div className="pointer-events-none absolute inset-0">
            {placeholder}
        </div>
    );

    const mediaOverlay = (
        <Link
            href={href}
            className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={item.title}
        />
    );

    return (
        <MediaCardFrame
            className="h-full"
            bookmarkPressed={saved}
            media={media}
            mediaOverlay={mediaOverlay}
            bookmark={
                <BookmarkIconButton
                    pressed={saved}
                    onClick={handleBookmark}
                    ariaLabel="Bookmark customization"
                    tooltipSide="top"
                />
            }
            mediaActions={
                <IconActionRow
                    className="shrink-0"
                    variant="media"
                    tooltipSide="top"
                    actions={[compareAction]}
                />
            }
            meta={
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {eyebrow}
                        </span>
                        <div className="flex shrink-0 items-center gap-2 sm:hidden">
                            <BookmarkIconButton
                                pressed={saved}
                                onClick={handleBookmark}
                                ariaLabel="Bookmark customization"
                                tooltipSide="top"
                            />
                            <IconActionRow
                                variant="media"
                                tooltipSide="top"
                                actions={[compareAction]}
                            />
                        </div>
                    </div>
                    <Link
                        href={href}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {item.title}
                        </h3>
                    </Link>
                </div>
            }
        />
    );
}
