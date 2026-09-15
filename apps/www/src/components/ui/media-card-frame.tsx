import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';

type MediaCardFrameProps = {
    media: ReactNode;
    meta: ReactNode;
    bookmark?: ReactNode;
    /** Desktop hover actions (e.g. compare) clustered with bookmark on the media. */
    mediaActions?: ReactNode;
    /** When true, desktop utility cluster stays visible without hover. */
    bookmarkPressed?: boolean;
    /** Settle-zoom on media. Default true. */
    settleZoom?: boolean;
    className?: string;
    /** Classes for the media frame (default includes `rounded-2xl bg-muted`). */
    mediaClassName?: string;
    /** Classes for the meta block (default adds `sm:mt-4` for vertical card spacing). */
    metaClassName?: string;
};

export function MediaCardFrame({
    media,
    bookmark,
    mediaActions,
    bookmarkPressed = false,
    settleZoom = true,
    meta,
    className,
    mediaClassName,
    metaClassName,
}: MediaCardFrameProps) {
    const mediaBody = settleZoom ? (
        <MediaSettleZoom>{media}</MediaSettleZoom>
    ) : (
        media
    );

    const hasUtilities = Boolean(bookmark || mediaActions);

    return (
        <div
            className={cn(
                'group flex flex-row items-start gap-4 sm:flex-col sm:items-stretch sm:gap-0',
                className,
            )}
        >
            {/* Outer: no overflow so utility tooltips can paint outside the image. */}
            <div
                className={cn(
                    'relative size-24 shrink-0 sm:aspect-square sm:size-auto sm:w-full',
                )}
            >
                <div
                    className={cn(
                        'absolute inset-0 overflow-hidden',
                        mediaClassName ?? 'rounded-2xl bg-muted',
                    )}
                >
                    {mediaBody}
                    {/* Desktop wash on hover so bottom utilities / scrubber stay legible */}
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/3 bg-linear-to-t from-black/10 to-transparent sm:block',
                            'sm:opacity-0 sm:transition-opacity sm:duration-150',
                            'sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                            'motion-reduce:sm:opacity-100',
                            bookmarkPressed && 'sm:opacity-100',
                        )}
                    />
                </div>
                {hasUtilities ? (
                    <div
                        className={cn(
                            // Desktop only: bottom-right cluster, hover reveal
                            'absolute z-30 hidden items-center gap-2 sm:flex',
                            'sm:right-3 sm:bottom-3',
                            'sm:opacity-0 sm:transition-opacity sm:duration-150',
                            'sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                            'motion-reduce:sm:opacity-100',
                            bookmarkPressed && 'sm:opacity-100',
                        )}
                    >
                        {bookmark}
                        {mediaActions}
                    </div>
                ) : null}
            </div>
            <div
                className={cn(
                    'relative z-10 min-w-0 flex-1 sm:w-full',
                    metaClassName ?? 'sm:mt-4',
                )}
            >
                {meta}
            </div>
        </div>
    );
}
