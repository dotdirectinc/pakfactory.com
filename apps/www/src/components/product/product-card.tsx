'use client';

import {StatusBadge} from '@/components/ui/status-badge';
import type {CatalogLifecycle} from '@/lib/catalog/types';
import {useState, type MouseEvent} from 'react';
import Link from 'next/link';
import {useLinkStatus} from 'next/link';
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
import {displayProductSku} from '@/lib/catalog/display-sku';
import {useSanityImageSettle} from '@/lib/sanity/use-sanity-image-settle';
import {usePointerPrefetch} from '@/lib/ui/use-pointer-prefetch';
import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';

/**
 * Catalog thumbs only (PROD-3102): under-report slot width so with 2× DPR
 * Next asks Sanity for ~display size (~400), not ~800–1080.
 * Mobile 1-col ≈ half viewport; sm+ fixed 200px CSS → ~400 CDN.
 */
const PRODUCT_CARD_IMAGE_SIZES = '(max-width: 640px) 50vw, 200px';

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
    /** Coming soon shows a badge on the image; listings never carry discontinued. */
    status?: CatalogLifecycle;
    /** Compatibility / match badge on the media (PROD-2921). */
    mediaBadgeLabel?: string;
    /** Short support line under the title (partial matches). */
    supportNote?: string;
};
type ProductCardProps = {
    data: ProductCardData;
    /** Above-fold catalog tiles — LCP candidates. */
    priority?: boolean;
    /** Catalog grid passes false; detail/related rails keep watermark. */
    applyWatermark?: boolean;
    /**
     * `elevated` — white media well on a muted band (`MediaCardFrame` surface).
     */
    surface?: 'default' | 'elevated';
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
 * Prefetch stays off for the grid; the card under the pointer (hover,
 * focus, or pointerdown) opts into full route prefetch so a click is more
 * likely to hit a warm payload without prefetching every PDP.
 */
export function ProductCard({
    data,
    priority = false,
    applyWatermark = true,
    surface = 'default',
}: ProductCardProps) {
    // Missing SKU shows "-" — never fall back to slug or style/line title.
    // Strip ?query so compatibility handoff hrefs don't pollute the slug.
    const pathOnly = data.href.split('?')[0] ?? '';
    const slugFromHref = pathOnly.split('/').filter(Boolean).pop() ?? '';
    const eyebrow = displayProductSku(data.sku, slugFromHref).toUpperCase();
    const [saved, setSaved] = useState(false);
    const {prefetch, enablePrefetch} = usePointerPrefetch(data.href);
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
        <ProductCardSettlingImage
            src={hero.src}
            alt={hero.alt ?? data.title}
            applyWatermark={applyWatermark}
            priority={priority}
        />
    ) : (
        <div className="pointer-events-none absolute inset-0">
            {placeholder}
        </div>
    );

    const mediaOverlay = (
        <Link
            href={data.href}
            prefetch={prefetch}
            onPointerEnter={enablePrefetch}
            onPointerDown={enablePrefetch}
            onFocus={enablePrefetch}
            className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={data.title}
        />
    );

    return (
        <MediaCardFrame
            surface={surface}
            bookmarkPressed={saved}
            media={media}
            mediaOverlay={mediaOverlay}
            statusBadge={
                data.mediaBadgeLabel ? (
                    <Badge
                        variant="secondary"
                        className="pointer-events-none shadow-sm"
                    >
                        {data.mediaBadgeLabel}
                    </Badge>
                ) : data.status && data.status !== 'active' ? (
                    <StatusBadge status={data.status} />
                ) : undefined
            }
            bookmark={
                <BookmarkIconButton
                    pressed={saved}
                    onClick={handleBookmark}
                    ariaLabel="Bookmark product"
                    tooltipSide="bottom"
                />
            }
            mediaActions={
                <IconActionRow
                    className="shrink-0"
                    variant="media"
                    tooltipSide="bottom"
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
                                tooltipSide="bottom"
                            />
                            <IconActionRow
                                variant="media"
                                tooltipSide="bottom"
                                actions={[compareAction]}
                            />
                        </div>
                    </div>
                    <Link
                        href={data.href}
                        prefetch={prefetch}
                        onPointerEnter={enablePrefetch}
                        onPointerDown={enablePrefetch}
                        onFocus={enablePrefetch}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ProductCardTitlePending title={data.title} />
                    </Link>
                    {data.supportNote ? (
                        <p className="text-xs text-muted-foreground">
                            {data.supportNote}
                        </p>
                    ) : null}
                </div>
            }
        />
    );
}

/**
 * Dissolves the CDN crop in over the frame's product-image well (`MediaCardFrame`
 * already paints `bg-product-image-bg`).
 */
function ProductCardSettlingImage({
    src,
    alt,
    applyWatermark,
    priority,
}: {
    src: string;
    alt: string;
    applyWatermark: boolean;
    priority: boolean;
}) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src);

    return (
        <div className="pointer-events-none absolute inset-0">
            <SanityImage
                src={src}
                alt={alt}
                applyWatermark={applyWatermark}
                fill
                priority={priority}
                square
                sizes={PRODUCT_CARD_IMAGE_SIZES}
                className={cn('object-cover', imageClassName)}
                onLoad={onLoad}
                onError={onError}
            />
        </div>
    );
}

function ProductCardTitlePending({title}: {title: string}) {
    const {pending} = useLinkStatus();
    return (
        <h3
            className={cn(
                'line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-opacity duration-200',
                pending && 'opacity-70',
            )}
        >
            {title}
        </h3>
    );
}
