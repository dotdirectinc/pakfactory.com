'use client';

import {LayoutGrid, List, type LucideIcon} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

export type CatalogView = 'list' | 'grid';

type ViewToggleProps = {
    value: CatalogView;
    onValueChange: (view: CatalogView) => void;
    /** Accessible name for the group, e.g. "Announcements layout". */
    'aria-label'?: string;
    className?: string;
};

const OPTIONS: {value: CatalogView; label: string; icon: LucideIcon}[] = [
    {value: 'list', label: 'List view', icon: List},
    {value: 'grid', label: 'Grid view', icon: LayoutGrid},
];

/** List / grid switch — two icon buttons, `aria-pressed` on the active one. Props-only (ADR-013). */
export function ViewToggle({
    value,
    onValueChange,
    'aria-label': ariaLabel = 'Layout',
    className,
}: ViewToggleProps) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn('inline-flex items-center gap-1', className)}
        >
            {OPTIONS.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => onValueChange(option.value)}
                        className={cn(
                            'flex size-9 items-center justify-center rounded-[length:var(--radius-control)] transition-colors',
                            'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            active
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Icon icon={option.icon} size="md" />
                    </button>
                );
            })}
        </div>
    );
}
