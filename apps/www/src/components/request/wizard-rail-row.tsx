'use client';

import {Check} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

export type WizardRailRowData = {
    key: string;
    title: string;
    subtitle?: string;
    complete?: boolean;
    missing?: string;
};

type WizardRailRowProps = {
    row: WizardRailRowData;
    active: boolean;
    complete: boolean;
    isLast: boolean;
    onClick: () => void;
    disabled?: boolean;
};

export function WizardRailRow({
    row,
    active,
    complete,
    isLast,
    onClick,
    disabled = false,
}: WizardRailRowProps) {
    const hasSubtitle = Boolean(row.subtitle?.trim());

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'group relative flex min-h-11 w-full gap-3 rounded-md px-2 pb-6 pt-2 text-left transition-colors hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-40',
                hasSubtitle ? 'items-start' : 'items-center',
            )}
        >
            {!isLast ? (
                <span
                    className={cn(
                        'absolute left-5 top-9 h-[calc(100%-8px)] w-px',
                        complete ? 'bg-foreground/30' : 'bg-border',
                    )}
                    aria-hidden
                />
            ) : null}
            <span
                className={cn(
                    'relative z-10 shrink-0',
                    hasSubtitle && 'mt-0.5',
                )}
            >
                {complete ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-foreground">
                        <Check
                            className="size-3.5 text-white"
                            strokeWidth={2.75}
                            aria-hidden
                        />
                    </span>
                ) : (
                    <span
                        className={cn(
                            'flex size-6 items-center justify-center rounded-full bg-background',
                            active
                                ? 'border-2 border-dotted border-foreground/70'
                                : 'border border-border',
                        )}
                    />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span
                    className={cn(
                        'block text-sm leading-tight',
                        complete || active
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80',
                    )}
                >
                    {row.title}
                </span>
                {hasSubtitle ? (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {row.subtitle}
                    </span>
                ) : null}
            </span>
        </button>
    );
}
