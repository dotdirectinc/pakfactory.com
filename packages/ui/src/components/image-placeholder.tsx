import type {ComponentProps} from 'react';
import {Package} from 'lucide-react';

import {cn} from '@pakfactory/ui/lib/utils';

/**
 * Empty media well — `bg-muted` + Package icon (same visual as catalog cards /
 * hero feature SVG). Parent owns size/aspect (`size-full`, `absolute inset-0`, etc.).
 */
function ImagePlaceholder({
    className,
    iconClassName,
    label = 'Image placeholder',
    ...props
}: ComponentProps<'div'> & {
    iconClassName?: string;
    /** Accessible name for the empty media region. */
    label?: string;
}) {
    return (
        <div
            data-slot="image-placeholder"
            role="img"
            aria-label={label}
            className={cn(
                'flex size-full items-center justify-center bg-muted text-muted-foreground/50',
                className,
            )}
            {...props}
        >
            <Package className={cn('size-8', iconClassName)} aria-hidden />
        </div>
    );
}

export {ImagePlaceholder};
