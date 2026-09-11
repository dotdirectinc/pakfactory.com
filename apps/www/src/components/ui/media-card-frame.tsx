import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';

type MediaCardFrameProps = {
    media: ReactNode;
    bookmark?: ReactNode;
    meta: ReactNode;
    className?: string;
    /** Classes for the aspect-square media frame (default includes `rounded-2xl bg-muted`). */
    mediaClassName?: string;
    /** Classes for the meta block below media (default `mt-4`). */
    metaClassName?: string;
};

export function MediaCardFrame({
    media,
    bookmark,
    meta,
    className,
    mediaClassName,
    metaClassName,
}: MediaCardFrameProps) {
    return (
        <div className={cn('group flex flex-col gap-0', className)}>
            <div
                className={cn(
                    'relative aspect-square overflow-hidden',
                    mediaClassName ?? 'rounded-2xl bg-muted',
                )}
            >
                <MediaSettleZoom>{media}</MediaSettleZoom>
                {bookmark ? (
                    <div className="absolute right-3 top-3 z-10">{bookmark}</div>
                ) : null}
            </div>
            <div className={cn('relative z-10', metaClassName ?? 'mt-4')}>
                {meta}
            </div>
        </div>
    );
}
