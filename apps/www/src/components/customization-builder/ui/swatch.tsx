'use client';

import {cn} from '@pakfactory/ui/lib/utils';

type SwatchProps = {
    label: string;
    selected?: boolean;
    onSelect?: () => void;
    /** Optional CSS color or leave empty for a neutral placeholder. */
    color?: string;
    className?: string;
};

export function Swatch({
    label,
    selected = false,
    onSelect,
    color,
    className,
}: SwatchProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            className={cn(
                'flex size-10 cursor-pointer items-center justify-center rounded-full border-2 transition-colors',
                selected
                    ? 'border-foreground'
                    : 'border-transparent ring-1 ring-border hover:ring-foreground/40',
                className,
            )}
        >
            <span
                className="size-7 rounded-full bg-muted"
                style={color ? {backgroundColor: color} : undefined}
                aria-hidden
            />
        </button>
    );
}
