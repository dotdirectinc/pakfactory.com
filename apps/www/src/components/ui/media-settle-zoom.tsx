import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    productMediaHoverClass,
    productMediaLayerClass,
} from '@/lib/ui/product-media-scale';

type MediaSettleZoomProps = {
    children: ReactNode;
    className?: string;
    /**
     * ADR-024 — lifestyle stills skip the product inset scale.
     * Default `product` keeps catalog / PDP product-shot behavior.
     */
    mediaKind?: 'product' | 'lifestyle';
};

/**
 * Shared media settle-zoom layer: rest at PRODUCT_MEDIA_SCALE, hover to 1.0 via parent `group`.
 * Parent must be `group relative overflow-hidden` (usually with `bg-muted`).
 * Lifestyle slides fill the frame without the product inset.
 */
export function MediaSettleZoom({
    children,
    className,
    mediaKind = 'product',
}: MediaSettleZoomProps) {
    if (mediaKind === 'lifestyle') {
        return (
            <div className={cn('absolute inset-0', className)}>{children}</div>
        );
    }
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
