import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    productMediaHoverClass,
    productMediaLayerClass,
} from '@/lib/ui/product-media-scale';

type MediaSettleZoomProps = {
    children: ReactNode;
    className?: string;
};

/**
 * Shared media settle-zoom layer: rest at PRODUCT_MEDIA_SCALE, hover to 1.0 via parent `group`.
 * Parent must be `group relative overflow-hidden` (usually with `bg-muted`).
 */
export function MediaSettleZoom({children, className}: MediaSettleZoomProps) {
    return (
        <div
            className={cn(
                productMediaLayerClass,
                productMediaHoverClass,
                className,
            )}
        >
            {children}
        </div>
    );
}
