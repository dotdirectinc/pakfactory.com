'use client';

import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {cn} from '@pakfactory/ui/lib/utils';

type OptionCardProps = {
    label: string;
    description?: string;
    selected?: boolean;
    onSelect?: () => void;
    className?: string;
};

export function OptionCard({
    label,
    description,
    selected = false,
    onSelect,
    className,
}: OptionCardProps) {
    return (
        <HighlightItem
            selected={selected}
            onClick={onSelect}
            className={cn('flex w-full flex-col gap-1', className)}
        >
            <span className="text-sm font-medium text-foreground">{label}</span>
            {description ? (
                <span className="text-xs text-muted-foreground">{description}</span>
            ) : null}
        </HighlightItem>
    );
}
