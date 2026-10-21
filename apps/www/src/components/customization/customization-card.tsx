'use client';

import {StatusBadge} from '@/components/ui/status-badge';
import {
    useEffect,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import Link from 'next/link';
import {useLinkStatus} from 'next/link';
import {useRouter} from 'next/navigation';
import {Columns2, Package} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {IconActionRow} from '@/components/ui/icon-action-row';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {stubBookmarkAction, stubCompareAction} from '@/lib/catalog-card-actions';
import type {CustomizationLibraryItem} from '@/lib/catalog/types';
import {useSanityImageSettle} from '@/lib/sanity/use-sanity-image-settle';
import {
    mediaDissolveHoverInClass,
    mediaDissolveRestHoverOutClass,
    mediaDissolveTransitionClass,
} from '@/lib/ui/media-dissolve';
import {customizationCategoryHref} from '@/lib/www-routes';

/** Card fields used by the tile (library items are a superset). */
export type CustomizationCardData = Pick<
    CustomizationLibraryItem,
    | '_id'
    | 'title'
    | 'shortName'
    | 'slug'
    | 'categoryValue'
    | 'categoryLabel'
    | 'typeTitle'
    | 'imageUrl'
    | 'imageAlt'
    | 'featuredImageUrl'
    | 'featuredImageAlt'
    | 'mediaImages'
    | 'featuredVideoUrl'
    | 'images'
    | 'status'
>;

type CustomizationCardProps = {
    item: CustomizationCardData;
    /** Above-fold catalog tiles — LCP candidates. */
    priority?: boolean;
};

const compareAction = {
    id: 'compare',
    label: 'Compare',
    ariaLabel: 'Compare',
    icon: Columns2,
    onClick: stubCompareAction,
} as const;

/**
 * Catalog thumbs only (PROD-3102 parity): under-report slot width so with 2× DPR
 * Next asks Sanity for ~display size (~400), not ~800–1080.
 * Same 1/2/3/4 grid as products.
 */
const IMAGE_SIZES = '(max-width: 640px) 50vw, 200px';

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return reduced;
}

/** Below `sm` (640px) — no hover video / image swap on narrow viewports. */
function useIsMobileViewport(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}

/**
 * Rest / hover resolution for customization library cards (ADR-024).
 * @see apps/www/docs/customizations-catalog.md § Business rules — customization card media
 */
function resolveCardMedia(item: CustomizationCardData) {
    const mediaImages = (item.mediaImages ?? []).filter((img) =>
        Boolean(img.src?.trim()),
    );
    const featuredUrl = item.featuredImageUrl?.trim() || null;
    const featuredAlt =
        item.featuredImageAlt?.trim() || item.imageAlt || item.title;
    const videoUrl = item.featuredVideoUrl?.trim() || null;

    const thumbSrc =
        featuredUrl ||
        mediaImages[0]?.src?.trim() ||
        item.imageUrl?.trim() ||
        null;
    const thumbAlt = featuredUrl
        ? featuredAlt
        : (mediaImages[0]?.alt ?? item.imageAlt ?? item.title);

    const hoverVideo =
        Boolean(thumbSrc) && Boolean(videoUrl) ? videoUrl : null;
    const nextStill = mediaImages.find(
        (img) => img.src?.trim() && img.src.trim() !== thumbSrc,
    );
    const hoverImage =
        !hoverVideo && nextStill?.src
            ? {
                  src: nextStill.src.trim(),
                  alt: nextStill.alt ?? item.title,
              }
            : null;

    return {thumbSrc, thumbAlt, hoverVideo, hoverImage};
}

/**
 * **Transactional card** — customization catalog tile (type eyebrow, short-name title, bookmark / compare).
 * Composes {@link MediaCardFrame}. Card media rules: primary product still at rest;
 * hover product video when both still + video exist, else the next product still.
 * Prefetch stays off for the grid; the card under the pointer opts into full route
 * prefetch (PROD-3102 product catalog parity).
 */
export function CustomizationCard({item, priority = false}: CustomizationCardProps) {
    const href = customizationCategoryHref(item.categoryValue, item.slug);
    const displayTitle = item.shortName?.trim() || item.title;
    const eyebrow = item.typeTitle?.trim().toUpperCase() ?? '';
    const router = useRouter();
    const [saved, setSaved] = useState(false);
    const [prefetch, setPrefetch] = useState(false);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();

    const {thumbSrc, thumbAlt, hoverVideo, hoverImage} = resolveCardMedia(item);
    const allowHoverFx = !prefersReducedMotion && !isMobile;
    const showHoverVideo = allowHoverFx && Boolean(hoverVideo);
    const showHoverImage = allowHoverFx && Boolean(hoverImage) && !showHoverVideo;

    useEffect(() => {
        if (showHoverVideo) return;
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
    }, [showHoverVideo]);

    function handleBookmark(event: MouseEvent<HTMLButtonElement>) {
        stubBookmarkAction(event);
        setSaved((prev) => !prev);
    }

    /** Warm the route immediately — don't wait for Link prefetch={true} state. */
    function enablePrefetch() {
        void router.prefetch(href);
        setPrefetch(true);
    }

    const startVideo = () => {
        if (!showHoverVideo) return;
        const el = videoRef.current;
        if (!el) return;
        void el.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
        );
    };

    const stopVideo = () => {
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
    };

    const placeholder = (
        <span className="flex size-full items-center justify-center">
            <Icon
                icon={Package}
                className="size-8 text-muted-foreground/50"
            />
        </span>
    );

    const media = (
        <div className="pointer-events-none absolute inset-0">
            {thumbSrc ? (
                <CustomizationCardSettlingImage
                    src={thumbSrc}
                    alt={thumbAlt}
                    priority={priority}
                    showHoverImage={showHoverImage}
                    hideForVideo={showHoverVideo && playing}
                />
            ) : (
                placeholder
            )}
            {showHoverImage && hoverImage ? (
                <SanityImage
                    src={hoverImage.src}
                    alt={hoverImage.alt}
                    applyWatermark={false}
                    fill
                    square
                    sizes={IMAGE_SIZES}
                    className={cn('object-cover', mediaDissolveHoverInClass)}
                />
            ) : null}
            {showHoverVideo && hoverVideo ? (
                <video
                    ref={videoRef}
                    src={hoverVideo}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden
                    className={cn(
                        'absolute inset-0 size-full object-cover',
                        mediaDissolveTransitionClass,
                        playing ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}
        </div>
    );

    const mediaOverlay = (
        <Link
            href={href}
            prefetch={prefetch}
            onPointerEnter={() => {
                enablePrefetch();
                startVideo();
            }}
            onPointerLeave={stopVideo}
            onPointerDown={enablePrefetch}
            onFocus={enablePrefetch}
            className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={displayTitle}
        />
    );

    return (
        <MediaCardFrame
            className="h-full"
            bookmarkPressed={saved}
            media={media}
            mediaOverlay={mediaOverlay}
            statusBadge={
                item.status && item.status !== 'active' ? (
                    <StatusBadge status={item.status} />
                ) : undefined
            }
            bookmark={
                <BookmarkIconButton
                    pressed={saved}
                    onClick={handleBookmark}
                    ariaLabel="Bookmark customization"
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
                                ariaLabel="Bookmark customization"
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
                        href={href}
                        prefetch={prefetch}
                        onPointerEnter={enablePrefetch}
                        onPointerDown={enablePrefetch}
                        onFocus={enablePrefetch}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <CustomizationCardTitlePending title={displayTitle} />
                    </Link>
                </div>
            }
        />
    );
}

/**
 * Dissolves the CDN crop in over the frame's product-image well (`MediaCardFrame`
 * already paints `bg-product-image-bg`). Hover still / video layers stay separate.
 */
function CustomizationCardSettlingImage({
    src,
    alt,
    priority,
    showHoverImage,
    hideForVideo,
}: {
    src: string;
    alt: string;
    priority: boolean;
    showHoverImage: boolean;
    hideForVideo: boolean;
}) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src);

    return (
        <SanityImage
            src={src}
            alt={alt}
            applyWatermark={false}
            fill
            priority={priority}
            square
            sizes={IMAGE_SIZES}
            className={cn(
                'object-cover',
                imageClassName,
                showHoverImage && mediaDissolveRestHoverOutClass,
                hideForVideo && 'sm:opacity-0',
            )}
            onLoad={onLoad}
            onError={onError}
        />
    );
}

function CustomizationCardTitlePending({title}: {title: string}) {
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
