'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
} from 'react';
import {useRouter} from 'next/navigation';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

import {CoverVideo} from '@/components/ui/cover-video';
import {
    HeroMediaCaption,
    type HeroMediaCaptionProps,
} from '@/components/ui/hero-media-caption';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';

/** Matches `--motion-slow` — keep in sync for exit unmount delay. */
const CAPTION_MOTION_MS = 500;

/** Movement before a gesture counts as a drag (not a click). */
const DRAG_CLICK_PX = 8;

export type MediaCaptionCardImage = {src: string; alt: string};

export type MediaCaptionCardProps = {
    /** Optional kind eyebrow — Finder omits; Spotlight-style callers may pass. */
    kindLabel?: string;
    title: string;
    description?: string;
    image?: MediaCaptionCardImage;
    /** Playable MP4 — plays + fades in when featured or hovered. */
    videoSrc?: string;
    /** `cover` fills edge-to-edge; `contain` keeps a padded muted well. Default `cover`. */
    imageFit?: 'contain' | 'cover';
    link?: HeroMediaCaptionProps['link'];
    stat?: HeroMediaCaptionProps['stat'];
    /**
     * Caption visibility: `always` (featured slot) or `hover` (peers).
     * Default `always` for non-Finder callers.
     */
    captionMode?: 'always' | 'hover';
    className?: string;
};

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mount + open state for caption grow/shrink. Enter opens after paint so
 * `scale-x` can transition; exit closes then unmounts after `--motion-slow`.
 */
function useCaptionReveal(showCaption: boolean) {
    const [mounted, setMounted] = useState(showCaption);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const reduce = prefersReducedMotion();

        if (showCaption) {
            setMounted(true);
            if (reduce) {
                setOpen(true);
                return;
            }
            setOpen(false);
            const id = requestAnimationFrame(() => {
                requestAnimationFrame(() => setOpen(true));
            });
            return () => cancelAnimationFrame(id);
        }

        setOpen(false);
        if (reduce) {
            setMounted(false);
            return;
        }
        const timeout = window.setTimeout(
            () => setMounted(false),
            CAPTION_MOTION_MS,
        );
        return () => clearTimeout(timeout);
    }, [showCaption]);

    return {mounted, open};
}

/**
 * Props-only media well + white caption panel for SectionCarousel / Finder
 * (PROD-2666). Kind-agnostic — product line, industry, case study, promo.
 *
 * When `link` is set, a non-drag click (or Enter/Space) navigates to the CTA.
 * Caption text link stops propagation so it remains a real nested control.
 */
export function MediaCaptionCard({
    kindLabel,
    title,
    description,
    image,
    videoSrc,
    imageFit = 'cover',
    link,
    stat,
    captionMode = 'always',
    className,
}: MediaCaptionCardProps) {
    const router = useRouter();
    const contain = imageFit === 'contain';
    const href = link?.href?.trim() || '';
    const navigable = Boolean(href);

    const [hovered, setHovered] = useState(false);
    const mediaActive = captionMode === 'always' || hovered;
    const {mounted: captionMounted, open: captionOpen} =
        useCaptionReveal(mediaActive);

    const dragRef = useRef({startX: 0, startY: 0, moved: false});
    const trimmedVideo = videoSrc?.trim();

    const navigate = useCallback(() => {
        if (!href) return;
        router.push(href);
    }, [href, router]);

    const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
        };
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;
        if (drag.moved) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > DRAG_CLICK_PX || Math.abs(dy) > DRAG_CLICK_PX) {
            drag.moved = true;
        }
    }, []);

    const onCardClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            if (!navigable) return;
            // Caption <Link> handles its own navigation.
            if ((event.target as HTMLElement).closest('a')) return;
            if (dragRef.current.moved) {
                event.preventDefault();
                return;
            }
            navigate();
        },
        [navigable, navigate],
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (!navigable) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            navigate();
        },
        [navigable, navigate],
    );

    const shellClass = cn(
        'group relative block w-full aspect-4/5 overflow-hidden rounded-xl bg-muted sm:aspect-5/4',
        navigable && 'cursor-pointer text-left',
        className,
    );

    const media = (
        <>
            {image ? (
                <SanityImage
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 768px) 85vw, 40vw"
                    className={cn(
                        contain
                            ? 'object-contain p-8 sm:p-12'
                            : 'object-cover',
                    )}
                />
            ) : null}
            {trimmedVideo ? (
                <CoverVideo
                    src={trimmedVideo}
                    active={mediaActive}
                    className={cn(
                        'transition-opacity duration-(--motion-slow) ease-out motion-reduce:transition-none',
                        mediaActive ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}
        </>
    );

    return (
        <div
            className={shellClass}
            role={navigable ? 'link' : undefined}
            tabIndex={navigable ? 0 : undefined}
            aria-label={navigable ? `${title}. ${link?.label ?? 'Open'}` : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setHovered(false);
                }
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onClick={onCardClick}
            onKeyDown={onKeyDown}
        >
            {/* Inner clip keeps zoom / video inside rounded corners. */}
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                {image || trimmedVideo ? (
                    contain ? (
                        // Contain: muted well + settle inset.
                        <MediaSettleZoom className="absolute inset-0">
                            {media}
                        </MediaSettleZoom>
                    ) : (
                        // Cover photos/video: fill edge-to-edge; hover zooms out (clipped).
                        <div
                            className={cn(
                                'absolute inset-0 origin-center backface-hidden',
                                '[transform:translateZ(0)_scale(1)]',
                                'transition-transform duration-300 ease-out',
                                'group-hover:[transform:translateZ(0)_scale(1.03)]',
                                'motion-reduce:transition-none',
                                'motion-reduce:group-hover:[transform:translateZ(0)_scale(1)]',
                            )}
                        >
                            {media}
                        </div>
                    )
                ) : (
                    <span className="flex size-full items-center justify-center pb-40 text-muted-foreground/40">
                        <PakFactoryMarkIcon size={48} className="-rotate-15" />
                    </span>
                )}
            </div>
            {/* Detail affordance: brand mark on hover/focus (media-tile-card) */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute z-30 hidden text-black/5 sm:block',
                    'sm:right-4 sm:top-4',
                    'sm:translate-x-[-5px] sm:translate-y-[5px] sm:opacity-0',
                    'sm:transition-[opacity,translate] sm:duration-[var(--motion-slow)] sm:ease-in-out',
                    'sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100',
                    'sm:group-focus-within:translate-x-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100',
                    'motion-reduce:sm:translate-x-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:opacity-100 motion-reduce:sm:transition-none',
                )}
            >
                <PakFactoryMarkIcon size={28} className="-rotate-15" />
            </div>
            {captionMounted ? (
                <HeroMediaCaption
                    {...(kindLabel ? {kindLabel} : {})}
                    title={title}
                    description={description}
                    link={link}
                    {...(stat ? {stat} : {})}
                    className={cn(
                        'absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-80',
                        'origin-bottom-right transition-[transform,opacity] duration-(--motion-slow) ease-out',
                        'motion-reduce:transition-none',
                        captionOpen
                            ? 'scale-x-100 opacity-100'
                            : 'scale-x-0 opacity-0',
                        'motion-reduce:scale-x-100 motion-reduce:opacity-100',
                    )}
                />
            ) : null}
        </div>
    );
}
