import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';

import {
    productMediaHoverClass,
    productMediaRestClass,
} from '@/lib/ui/product-media-scale';

type MediaCardFrameProps = {
    /** Image content inside the media chrome. */
    media: ReactNode;
    /**
     * Full-bleed layer above media (hit targets, closer-look, etc.).
     * Settles with the chrome container.
     */
    mediaOverlay?: ReactNode;
    meta: ReactNode;
    bookmark?: ReactNode;
    /** Desktop hover actions (e.g. compare) clustered with bookmark on the media. */
    mediaActions?: ReactNode;
    /** When true, desktop utility cluster stays visible without hover. */
    bookmarkPressed?: boolean;
    /** Settle-zoom on the media chrome. Default true. */
    settleZoom?: boolean;
    className?: string;
    /** Classes for the media frame (default includes `rounded-2xl bg-muted`). */
    mediaClassName?: string;
    /** Classes for the meta block (default adds `sm:mt-4 sm:px-3` for vertical spacing + radius alignment). */
    metaClassName?: string;
    /**
     * `elevated` — media well uses `bg-background` instead of `bg-muted`
     * (for muted section bands). Ignored when `mediaClassName` is set.
     */
    surface?: 'default' | 'elevated';
};

/**
 * **Transactional card** frame — media + meta layout with optional bookmark / compare
 * utilities and brand-mark affordance. Product and customization tiles compose this.
 * Settle-zoom (`PRODUCT_MEDIA_SCALE`) scales the media chrome (rounded holder) like
 * catalog tiles; meta stays unscaled. Tooltips escape the outer slot.
 */
export function MediaCardFrame({
    media,
    mediaOverlay,
    bookmark,
    mediaActions,
    bookmarkPressed = false,
    settleZoom = true,
    meta,
    className,
    mediaClassName,
    metaClassName,
    surface = 'default',
}: MediaCardFrameProps) {
    const hasUtilities = Boolean(bookmark || mediaActions);
    const hoverReveal = cn(
        'sm:opacity-0 sm:transition-opacity sm:duration-[var(--motion-fast)] sm:ease-out',
        'sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
        'motion-reduce:sm:opacity-100',
        bookmarkPressed && 'sm:opacity-100',
    );
    const markReveal = cn(
        'sm:translate-x-[-5px] sm:translate-y-[5px] sm:opacity-0 sm:delay-0',
        'sm:transition-[opacity,translate] sm:duration-[var(--motion-slow)] sm:ease-in-out',
        'sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-hover:delay-75',
        'sm:group-focus-within:translate-x-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-focus-within:delay-75',
        'motion-reduce:sm:translate-x-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:opacity-100 motion-reduce:sm:transition-none motion-reduce:sm:delay-0',
        bookmarkPressed &&
            'sm:translate-x-0 sm:translate-y-0 sm:opacity-100 sm:delay-0',
    );

    return (
        <div
            className={cn(
                'group flex flex-row items-start gap-4 sm:flex-col sm:items-stretch sm:gap-0',
                className,
            )}
        >
            {/* Outer: layout slot; no overflow so utility tooltips can paint outside. */}
            <div className="relative size-24 shrink-0 sm:aspect-square sm:size-auto sm:w-full">
                <div
                    className={cn(
                        'absolute inset-0',
                        settleZoom && productMediaRestClass,
                        settleZoom && productMediaHoverClass,
                    )}
                >
                    {/* Media chrome — settles with the wrapper */}
                    <div
                        className={cn(
                            'absolute inset-0 overflow-hidden',
                            mediaClassName ??
                                (surface === 'elevated'
                                    ? 'rounded-2xl bg-background'
                                    : 'rounded-2xl bg-muted'),
                        )}
                    >
                        {media}
                        {/* Desktop wash on hover so mark / utilities stay legible */}
                        <div
                            aria-hidden
                            className={cn(
                                'pointer-events-none absolute inset-0 z-[1] hidden bg-black/2 sm:block',
                                hoverReveal,
                            )}
                        />
                        {mediaOverlay ? (
                            <div className="absolute inset-0 z-10">
                                {mediaOverlay}
                            </div>
                        ) : null}
                    </div>
                    {/* Detail affordance: brand mark eases in with overlay */}
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute z-30 hidden text-black/45 sm:block',
                            'sm:right-4 sm:top-4',
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
                                'sm:right-4 sm:bottom-4',
                                hoverReveal,
                            )}
                        >
                            {bookmark}
                            {mediaActions}
                        </div>
                    ) : null}
                </div>
            </div>
            <div
                className={cn(
                    'relative z-10 min-w-0 flex-1 sm:w-full',
                    metaClassName ?? 'sm:mt-4 sm:px-3',
                )}
            >
                {meta}
            </div>
        </div>
    );
}
