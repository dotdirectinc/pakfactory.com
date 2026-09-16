'use client';

import {cn} from '@pakfactory/ui/lib/utils';

import type {SectionTheme} from '@/lib/ui/section-theme';

export type CategorySegmentItem = {
    id: string;
    label: string;
};

type CategorySegmentControlProps = {
    items: CategorySegmentItem[];
    value: string;
    onValueChange: (id: string) => void;
    className?: string;
    /**
     * Section color band (not app dark/light mode).
     * `muted` = elevated white track against a recessed band.
     */
    theme?: SectionTheme;
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
    theme = 'default',
    'aria-label': ariaLabel = 'Categories',
}: CategorySegmentControlProps) {
    if (items.length === 0) return null;

    return (
        <nav
            aria-label={ariaLabel}
            className={cn(
                'inline-flex max-w-full flex-wrap gap-1 rounded-full p-1',
                theme === 'muted' ? 'bg-background' : 'bg-muted',
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
