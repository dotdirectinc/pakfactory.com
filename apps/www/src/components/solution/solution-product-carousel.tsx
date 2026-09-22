'use client';

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import Image from 'next/image';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

import {SolutionProductPreview} from '@/components/solution/solution-product-preview';
import {
    getMockSolutionProduct,
    type SolutionProductMock,
} from '@/lib/solutions/fixtures/mock-solution-products';
import type {SolutionHeroTile} from '@/lib/solutions/types';

gsap.registerPlugin(ScrollTrigger);

/** Desktop max curated images on the Industry LP hero. */
const MAX_HERO_TILES_DESKTOP = 16;
const MAX_HERO_TILES_TABLET = 8;
const MAX_HERO_TILES_MOBILE = 4;
/** Cards sized to fit in the viewport per row (track may hold more for scrub). */
const VISIBLE_CARDS_PER_ROW_DESKTOP = 5;
const VISIBLE_CARDS_PER_ROW_TABLET = 3;
const VISIBLE_CARDS_PER_ROW_MOBILE = 2;
/** Card gap — 24px / `gap-6` (8pt). */
const TILE_GAP_PX = 24;
/** Scroll-scrub travel ≈ two card strides. */
const SCRUB_CARD_COUNT = 2;
/** Tablet/desktop portrait card: width / height. */
const TILE_ASPECT = 3 / 4;
/** Mobile square card: width / height. */
const TILE_ASPECT_MOBILE = 1;
/** Wide cards share portrait height; width is this factor × unit. */
const WIDE_WIDTH_FACTOR = 1.5;
/** Every Nth card in a row is wide (0-based index === N - 1). */
const WIDE_EVERY_N = 4;
/** Shift row B variant index so wides don’t stack under row A. */
const ROW_B_VARIANT_OFFSET = 2;

type CardVariant = 'portrait' | 'wide';

type SolutionProductCarouselProps = {
    tiles: SolutionHeroTile[];
    className?: string;
    /** Parent track shell fill. Default `default` (`bg-background`). */
    background?: 'default' | 'transparent';
};

type SizedTile = SolutionHeroTile & {renderKey: string};

type GalleryBreakpoint = 'mobile' | 'tablet' | 'desktop';

function cardVariantForIndex(
    indexInRow: number,
    rowOffset: number,
    breakpoint: GalleryBreakpoint,
): CardVariant {
    if (breakpoint === 'mobile') return 'portrait';
    return (indexInRow + rowOffset) % WIDE_EVERY_N === WIDE_EVERY_N - 1
        ? 'wide'
        : 'portrait';
}

function cardWidthForVariant(unitWidth: number, variant: CardVariant): number {
    return variant === 'wide' ? unitWidth * WIDE_WIDTH_FACTOR : unitWidth;
}

function useGalleryBreakpoint(): GalleryBreakpoint {
    const [bp, setBp] = useState<GalleryBreakpoint>('desktop');

    useEffect(() => {
        const mqLg = window.matchMedia('(min-width: 1024px)');
        const mqSm = window.matchMedia('(min-width: 640px)');

        const sync = () => {
            if (mqLg.matches) setBp('desktop');
            else if (mqSm.matches) setBp('tablet');
            else setBp('mobile');
        };
        sync();
        mqLg.addEventListener('change', sync);
        mqSm.addEventListener('change', sync);
        return () => {
            mqLg.removeEventListener('change', sync);
            mqSm.removeEventListener('change', sync);
        };
    }, []);

    return bp;
}

function splitRowsForBreakpoint(
    tiles: SolutionHeroTile[],
    breakpoint: GalleryBreakpoint,
): {rowA: SolutionHeroTile[]; rowB: SolutionHeroTile[]} {
    const maxTiles =
        breakpoint === 'desktop'
            ? MAX_HERO_TILES_DESKTOP
            : breakpoint === 'tablet'
              ? MAX_HERO_TILES_TABLET
              : MAX_HERO_TILES_MOBILE;

    let usable = Math.min(maxTiles, tiles.length);
    usable -= usable % 2;
    if (usable === 0) return {rowA: [], rowB: []};
    const half = usable / 2;
    const sliced = tiles.slice(0, usable);
    return {
        rowA: sliced.slice(0, half),
        rowB: sliced.slice(half),
    };
}

function duplicateRow(
    row: SolutionHeroTile[],
    rowId: 'a' | 'b',
): SizedTile[] {
    return [0, 1].flatMap((copy) =>
        row.map((tile) => ({
            ...tile,
            renderKey: `${tile.id}-${rowId}-${copy}`,
        })),
    );
}

/**
 * Full-width height reservation before shellWidth is measured.
 * Uses flex-1 + breakpoint aspect so row height matches live cards — no 100vw widths.
 */
function GallerySkeleton({
    hasRowB,
    visibleCardsPerRow,
    aspectClass,
}: {
    hasRowB: boolean;
    visibleCardsPerRow: number;
    aspectClass: string;
}) {
    const slots = Math.max(1, visibleCardsPerRow);

    return (
        <div className="flex w-full flex-col gap-6" aria-hidden>
            <div className="flex w-full" style={{gap: TILE_GAP_PX}}>
                {Array.from({length: slots}, (_, index) => (
                    <Skeleton
                        key={`skeleton-a-${index}`}
                        className={cn(
                            'min-w-0 flex-1 rounded-[10px]',
                            aspectClass,
                        )}
                    />
                ))}
            </div>
            {hasRowB ? (
                <div className="flex w-full" style={{gap: TILE_GAP_PX}}>
                    {Array.from({length: slots}, (_, index) => (
                        <Skeleton
                            key={`skeleton-b-${index}`}
                            className={cn(
                                'min-w-0 flex-1 rounded-[10px]',
                                aspectClass,
                            )}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function TileButton({
    tile,
    width,
    height,
    onSelect,
}: {
    tile: SolutionHeroTile;
    width: number;
    height: number;
    onSelect: (tileId: string) => void;
}) {
    const image = tile.image;
    const hasImage = Boolean(image?.src);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
    }, [image?.src]);

    return (
        <button
            type="button"
            onClick={() => onSelect(tile.id)}
            className={cn(
                'group/tile relative block shrink-0 overflow-hidden rounded-[10px]',
                'bg-muted ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            style={{width, height}}
            aria-label={tile.label ? `View ${tile.label}` : 'View product'}
        >
            {hasImage && image ? (
                <Image
                    src={image.src}
                    alt={image.alt || tile.label || ''}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 33vw, 20vw"
                    className={cn(
                        'object-cover transition-opacity duration-[var(--motion-slow)] ease-in-out',
                        imageLoaded ? 'opacity-100' : 'opacity-0',
                        'motion-reduce:transition-none',
                        'motion-reduce:opacity-100',
                    )}
                    onLoad={() => setImageLoaded(true)}
                />
            ) : null}
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none absolute right-4 top-4 z-10 text-black',
                    'opacity-[0.06] -rotate-15 translate-x-0 translate-y-0',
                    'transition-[opacity,translate] duration-[var(--motion-slow)] ease-in-out',
                    'group-hover/tile:translate-x-1 group-hover/tile:-translate-y-1 group-hover/tile:opacity-50',
                    'group-focus-visible/tile:translate-x-1 group-focus-visible/tile:-translate-y-1 group-focus-visible/tile:opacity-50',
                    'motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:transition-none',
                )}
            >
                <PakFactoryMarkIcon size={28} />
            </span>
        </button>
    );
}

/**
 * Responsive dual-row solution-product cards with fill-width sizing and
 * opposite scroll scrub. Mobile uses square tiles (2 visible per row);
 * tablet/desktop use portrait (+ occasional wide). Click opens preview.
 */
export function SolutionProductCarousel({
    tiles,
    className,
    background = 'default',
}: SolutionProductCarouselProps) {
    const [selected, setSelected] = useState<SolutionProductMock | null>(null);
    const [open, setOpen] = useState(false);
    const [shellWidth, setShellWidth] = useState(0);
    const shellRef = useRef<HTMLDivElement>(null);
    const rowARef = useRef<HTMLDivElement>(null);
    const rowBRef = useRef<HTMLDivElement>(null);
    const breakpoint = useGalleryBreakpoint();

    const {rowA, rowB} = useMemo(
        () => splitRowsForBreakpoint(tiles, breakpoint),
        [tiles, breakpoint],
    );
    const countPerRow = rowA.length;
    const hasRowB = rowB.length > 0;
    const visibleCardsPerRow =
        breakpoint === 'desktop'
            ? VISIBLE_CARDS_PER_ROW_DESKTOP
            : breakpoint === 'tablet'
              ? VISIBLE_CARDS_PER_ROW_TABLET
              : VISIBLE_CARDS_PER_ROW_MOBILE;

    const tileAspect =
        breakpoint === 'mobile' ? TILE_ASPECT_MOBILE : TILE_ASPECT;
    const unitWidth =
        shellWidth > 0 && visibleCardsPerRow > 0
            ? (shellWidth - (visibleCardsPerRow - 1) * TILE_GAP_PX) /
              visibleCardsPerRow
            : 0;
    const cardHeight = unitWidth > 0 ? unitWidth / tileAspect : 0;

    const rowATrack = useMemo(
        () => (countPerRow > 0 ? duplicateRow(rowA, 'a') : []),
        [rowA, countPerRow],
    );
    const rowBTrack = useMemo(
        () => (hasRowB ? duplicateRow(rowB, 'b') : []),
        [rowB, hasRowB],
    );

    useLayoutEffect(() => {
        const shell = shellRef.current;
        if (!shell) return;

        const syncWidth = () => {
            setShellWidth(shell.getBoundingClientRect().width);
        };
        syncWidth();

        const ro = new ResizeObserver(syncWidth);
        ro.observe(shell);
        return () => ro.disconnect();
    }, []);

    useLayoutEffect(() => {
        const shell = shellRef.current;
        const rowAEl = rowARef.current;
        if (!shell || !rowAEl || unitWidth <= 0) return;

        const rowBEl = rowBRef.current;
        const targets = rowBEl ? [rowAEl, rowBEl] : [rowAEl];

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.set(targets, {x: 0});
            return;
        }

        const scrubDistance = (unitWidth + TILE_GAP_PX) * SCRUB_CARD_COUNT;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: shell,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1,
                    invalidateOnRefresh: true,
                },
            });
            tl.fromTo(
                rowAEl,
                {x: 0},
                {x: -scrubDistance, ease: 'none'},
                0,
            );
            if (rowBEl) {
                tl.fromTo(
                    rowBEl,
                    {x: -scrubDistance},
                    {x: 0, ease: 'none'},
                    0,
                );
            }
        }, shell);

        ScrollTrigger.refresh();
        return () => ctx.revert();
    }, [unitWidth, countPerRow, hasRowB, rowATrack.length, rowBTrack.length]);

    function handleTileClick(tileId: string) {
        const product = getMockSolutionProduct(tileId);
        if (!product) return;
        setSelected(product);
        setOpen(true);
    }

    if (countPerRow === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-col gap-6', className)}>
            <div
                ref={shellRef}
                className={cn(
                    'relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] flex w-screen max-w-[100vw] flex-col gap-6 overflow-hidden',
                    background === 'transparent'
                        ? 'bg-transparent'
                        : 'bg-background',
                )}
            >
                {unitWidth > 0 ? (
                    <div className="flex flex-col gap-6 animate-in fade-in-0 duration-[var(--motion-slow)] motion-reduce:animate-none">
                        <div
                            ref={rowARef}
                            className="flex w-max will-change-transform"
                            style={{gap: TILE_GAP_PX}}
                        >
                            {rowATrack.map((tile, index) => {
                                const variant = cardVariantForIndex(
                                    index % countPerRow,
                                    0,
                                    breakpoint,
                                );
                                return (
                                    <TileButton
                                        key={tile.renderKey}
                                        tile={tile}
                                        width={cardWidthForVariant(
                                            unitWidth,
                                            variant,
                                        )}
                                        height={cardHeight}
                                        onSelect={handleTileClick}
                                    />
                                );
                            })}
                        </div>
                        {hasRowB ? (
                            <div
                                ref={rowBRef}
                                className="flex w-max will-change-transform"
                                style={{gap: TILE_GAP_PX}}
                            >
                                {rowBTrack.map((tile, index) => {
                                    const variant = cardVariantForIndex(
                                        index % countPerRow,
                                        ROW_B_VARIANT_OFFSET,
                                        breakpoint,
                                    );
                                    return (
                                        <TileButton
                                            key={tile.renderKey}
                                            tile={tile}
                                            width={cardWidthForVariant(
                                                unitWidth,
                                                variant,
                                            )}
                                            height={cardHeight}
                                            onSelect={handleTileClick}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <GallerySkeleton
                        hasRowB={hasRowB}
                        visibleCardsPerRow={visibleCardsPerRow}
                        aspectClass={
                            breakpoint === 'mobile'
                                ? 'aspect-square'
                                : 'aspect-[3/4]'
                        }
                    />
                )}
            </div>

            <SolutionProductPreview
                product={selected}
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}
