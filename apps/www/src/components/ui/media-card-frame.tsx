import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
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

/**
 * **Transactional card** frame — media + meta layout with optional bookmark / compare
 * utilities and brand-mark affordance. Product and customization tiles compose this.
 * Media uses settle-zoom (`PRODUCT_MEDIA_SCALE`); utilities hover-reveal on desktop.
 */
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
    const hoverReveal = cn(
        'sm:opacity-0 sm:transition-opacity sm:duration-[var(--motion-fast)] sm:ease-out',
        'sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
        'motion-reduce:sm:opacity-100',
        bookmarkPressed && 'sm:opacity-100',
    );
    const markReveal = cn(
        'sm:translate-x-[-5px] sm:translate-y-[5px] sm:opacity-0',
        'sm:transition-[opacity,translate] sm:duration-[var(--motion-slow)] sm:ease-in-out',
        'sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100',
        'sm:group-focus-within:translate-x-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100',
        'motion-reduce:sm:translate-x-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:opacity-100 motion-reduce:sm:transition-none',
        bookmarkPressed &&
            'sm:translate-x-0 sm:translate-y-0 sm:opacity-100',
    );

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
                    {/* Desktop wash on hover so mark / utilities stay legible */}
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute inset-0 hidden bg-black/2 sm:block',
                            hoverReveal,
                        )}
                    />
                </div>
                {/* Detail affordance: brand mark eases in with overlay */}
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute z-30 hidden text-black/5 sm:block',
                        'sm:right-3 sm:top-3',
                        markReveal,
                    )}
                >
                    <PakFactoryMarkIcon size={28} className="-rotate-15" />
                </div>
                {hasUtilities ? (
                    <div
                        className={cn(
                            // Desktop only: bottom-right cluster, hover reveal
                            'absolute z-30 hidden items-center gap-2 sm:flex',
                            'sm:right-3 sm:bottom-3',
                            hoverReveal,
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
