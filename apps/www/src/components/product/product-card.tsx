'use client';

import {useState, type MouseEvent} from 'react';
import Link from 'next/link';
import {Columns2, Package} from 'lucide-react';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {IconActionRow} from '@/components/ui/icon-action-row';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    stubBookmarkAction,
    stubCompareAction,
} from '@/lib/catalog-card-actions';

export type ProductCardImage = {
    src: string;
    alt?: string;
};

export type ProductCardData = {
    title: string;
    href: string;
    sku?: string;
    eyebrowLabel?: string;
    imageUrl?: string | null;
    imageAlt?: string;
    /** Extra gallery frames; hero is images[0] or imageUrl. */
    images?: ProductCardImage[];
    moq?: number | string;
    leadTime?: string;
};

type ProductCardProps = {
    data: ProductCardData;
};

function resolveGallery(data: ProductCardData): ProductCardImage[] {
    if (data.images && data.images.length > 0) {
        return data.images.filter((img) => Boolean(img.src));
    }
    if (data.imageUrl) {
        return [{src: data.imageUrl, alt: data.imageAlt ?? data.title}];
    }
    return [];
}

const compareAction = {
    id: 'compare',
    label: 'Compare',
    ariaLabel: 'Compare',
    icon: Columns2,
    onClick: stubCompareAction,
} as const;

/**
 * **Transactional card** — product catalog tile (SKU eyebrow, bookmark / compare).
 * Composes {@link MediaCardFrame}.
 */
export function ProductCard({data}: ProductCardProps) {
    const eyebrow = (data.sku ?? data.eyebrowLabel ?? '').toUpperCase();
    const [saved, setSaved] = useState(false);
    const gallery = resolveGallery(data);

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
        <div className="absolute inset-0">
            <Link
                href={data.href}
                className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="pointer-events-none absolute inset-0 z-0">
                <SanityImage
                    src={hero.src}
                    alt={hero.alt ?? data.title}
                    applyWatermark
                    fill
                    sizes="(max-width: 640px) 96px, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover"
                />
            </div>
        </div>
    ) : (
        <Link
            href={data.href}
            className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
            {placeholder}
        </Link>
    );

    return (
        <MediaCardFrame
            bookmarkPressed={saved}
            media={media}
            bookmark={
                <BookmarkIconButton
                    pressed={saved}
                    onClick={handleBookmark}
                    ariaLabel="Bookmark product"
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
                        {eyebrow ? (
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {eyebrow}
                            </span>
                        ) : (
                            <span className="min-w-0 flex-1" />
                        )}
                        <div className="flex shrink-0 items-center gap-2 sm:hidden">
                            <BookmarkIconButton
                                pressed={saved}
                                onClick={handleBookmark}
                                ariaLabel="Bookmark product"
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
                        href={data.href}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {data.title}
                        </h3>
                    </Link>
                </div>
            }
        />
    );
}
