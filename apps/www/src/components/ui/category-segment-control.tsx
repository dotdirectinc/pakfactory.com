'use client';

import {cn} from '@pakfactory/ui/lib/utils';

export type CategorySegmentItem = {
    id: string;
    label: string;
};

type CategorySegmentControlProps = {
    items: CategorySegmentItem[];
    value: string;
    onValueChange: (id: string) => void;
    className?: string;
    'aria-label'?: string;
};

/**
 * Apple-style category tab grouping — muted track, inverse active pill.
 * Props-only (ADR-013).
 */
export function CategorySegmentControl({
    items,
    value,
    onValueChange,
    className,
    'aria-label': ariaLabel = 'Categories',
}: CategorySegmentControlProps) {
    if (items.length === 0) return null;

    return (
        <nav
            aria-label={ariaLabel}
            className={cn(
                'inline-flex max-w-full flex-wrap gap-1 rounded-full bg-muted p-1',
                className,
            )}
        >
            {items.map((item) => {
                const selected = item.id === value;
                return (
                    <button
                        key={item.id}
                        type="button"
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                            'cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors',
                            selected
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => onValueChange(item.id)}
                    >
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
}
