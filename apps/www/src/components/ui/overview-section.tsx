import type {ComponentPropsWithoutRef, ElementType, ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

type OverviewSectionOwnProps = {
    title?: string;
    description?: string;
    required?: boolean;
    as?: 'section' | 'div';
    className?: string;
    children: ReactNode;
};

export type OverviewSectionProps = OverviewSectionOwnProps &
    Omit<ComponentPropsWithoutRef<'section'>, keyof OverviewSectionOwnProps>;

/**
 * Muted overview well shared by PDP buy-box bands and CDP overview rails.
 * Chrome matches Quantity / Contents / Customization: `rounded-2xl bg-muted p-6`.
 */
export function OverviewSection({
    title,
    description,
    required = false,
    as,
    className,
    children,
    ...rest
}: OverviewSectionProps) {
    const Comp: ElementType = as ?? 'section';
    const hasHeader = Boolean(title || description);

    return (
        <Comp className={cn('rounded-2xl bg-muted p-6', className)} {...rest}>
            {hasHeader ? (
                <div>
                    {title ? (
                        <h2 className="text-base font-semibold text-brand-blue">
                            {title}
                            {required ? (
                                <span className="text-destructive" aria-hidden>
                                    {' '}
                                    *
                                </span>
                            ) : null}
                        </h2>
                    ) : null}
                    {description ? (
                        <p
                            className={cn(
                                'text-sm leading-snug text-muted-foreground',
                                title && 'mt-1',
                            )}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <div className={cn(hasHeader && 'mt-4')}>{children}</div>
        </Comp>
    );
}
