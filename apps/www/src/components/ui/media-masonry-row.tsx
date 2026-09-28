import Image from 'next/image';
import {cn} from '@pakfactory/ui/lib/utils';

export type MediaMasonryTile = {
    id: string;
    src: string;
    alt: string;
    /** Desktop width in px; height is uniform via `rowHeight`. */
    width?: number;
};

export type MediaMasonryRowProps = {
    tiles: MediaMasonryTile[];
    /** Uniform row height in px. Default 401 (Figma industry hero). */
    rowHeight?: number;
    /** Gap between tiles in px. Default 24. */
    gap?: number;
    /** Horizontal start offset so the track bleeds (Figma ~-218). */
    trackOffset?: number;
    roundedClassName?: string;
    className?: string;
};

const DEFAULT_TILE_WIDTH = 320;

/**
 * Props-only full-bleed horizontal media track.
 * Callers own tile content; no feature-specific imports.
 */
export function MediaMasonryRow({
    tiles,
    rowHeight = 401,
    gap = 24,
    trackOffset = 0,
    roundedClassName = 'rounded-[10px]',
    className,
}: MediaMasonryRowProps) {
    if (tiles.length === 0) {
        return null;
    }

    return (
        <div
            className={cn('w-full overflow-hidden', className)}
            style={{height: rowHeight}}
        >
            <div
                className="flex items-start"
                style={{
                    gap,
                    transform: `translate3d(${trackOffset}px, 0, 0)`,
                    height: rowHeight,
                }}
            >
                {tiles.map((tile) => {
                    const width = tile.width ?? DEFAULT_TILE_WIDTH;
                    return (
                        <div
                            key={tile.id}
                            className={cn(
                                'relative shrink-0 overflow-hidden',
                                roundedClassName,
                            )}
                            style={{width, height: rowHeight}}
                        >
                            <Image
                                src={tile.src}
                                alt={tile.alt}
                                fill
                                className="object-cover"
                                sizes={`${width}px`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
