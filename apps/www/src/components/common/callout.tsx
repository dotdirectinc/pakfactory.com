import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

type CalloutProps = {
    className?: string;
    children: ReactNode;
};

/**
 * Quiet muted strip — shared chrome for inline notices (banner, upsell row).
 * Props-only; callers own content and actions.
 */
export function Callout({className, children}: CalloutProps) {
    return (
        <div
            className={cn(
                'rounded-sm border border-border bg-muted/40 px-4 py-3',
                className,
            )}
        >
            {children}
        </div>
    );
}
