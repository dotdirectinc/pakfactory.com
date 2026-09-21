'use client';

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
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
/** Tile gap — 24px / `gap-6` (8pt). */
const TILE_GAP_PX = 24;
/** Scroll-scrub travel ≈ two card strides. */
const SCRUB_CARD_COUNT = 2;
/** Portrait tile: width / height. */
const TILE_ASPECT = 3 / 4;

type SolutionProductCarouselProps = {
    tiles: SolutionHeroTile[];
    className?: string;
    /** Parent track shell fill. Default `default` (`bg-background`). */
    background?: 'default' | 'transparent';
};

type SizedTile = SolutionHeroTile & {renderKey: string};

type GalleryBreakpoint = 'mobile' | 'tablet' | 'desktop';

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

    if (breakpoint === 'mobile') {
        if (usable === 0) return {rowA: [], rowB: []};
        return {rowA: tiles.slice(0, usable), rowB: []};
    }

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
 * Responsive dual-row (single-row on mobile) solution-product tiles with
 * fill-width sizing and opposite scroll scrub. Click opens preview.
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
    // Mobile: one full-width tile in view; tablet/desktop fill the row.
    const visiblePerRow = breakpoint === 'mobile' ? 1 : countPerRow;

    const tileWidth =
        shellWidth > 0 && visiblePerRow > 0
            ? (shellWidth - (visiblePerRow - 1) * TILE_GAP_PX) / visiblePerRow
            : 0;
    const tileHeight = tileWidth > 0 ? tileWidth / TILE_ASPECT : 0;

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
        if (!shell || !rowAEl || tileWidth <= 0) return;

        const rowBEl = rowBRef.current;
        const targets = rowBEl ? [rowAEl, rowBEl] : [rowAEl];

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.set(targets, {x: 0});
            return;
        }

        const scrubDistance = (tileWidth + TILE_GAP_PX) * SCRUB_CARD_COUNT;

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
    }, [tileWidth, countPerRow, hasRowB, rowATrack.length, rowBTrack.length]);

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
                {tileWidth > 0 ? (
                    <>
                        <div
                            ref={rowARef}
                            className="flex w-max will-change-transform"
                            style={{gap: TILE_GAP_PX}}
                        >
                            {rowATrack.map((tile) => (
                                <TileButton
                                    key={tile.renderKey}
                                    tile={tile}
                                    width={tileWidth}
                                    height={tileHeight}
                                    onSelect={handleTileClick}
                                />
                            ))}
                        </div>
                        {hasRowB ? (
                            <div
                                ref={rowBRef}
                                className="flex w-max will-change-transform"
                                style={{gap: TILE_GAP_PX}}
                            >
                                {rowBTrack.map((tile) => (
                                    <TileButton
                                        key={tile.renderKey}
                                        tile={tile}
                                        width={tileWidth}
                                        height={tileHeight}
                                        onSelect={handleTileClick}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>

            <SolutionProductPreview
                product={selected}
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}
