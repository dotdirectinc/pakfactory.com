'use client';

import type {LucideIcon} from 'lucide-react';
import type {MouseEvent} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';

export type IconAction = {
    id: string;
    label: string;
    ariaLabel: string;
    icon: LucideIcon;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
};

type IconActionRowProps = {
    actions: IconAction[];
    className?: string;
};

const TOOLTIP_CLASS =
    'pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-[13px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100';

export function IconActionRow({actions, className}: IconActionRowProps) {
    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {actions.map(
                ({id, label, ariaLabel, icon, onClick, disabled}) => (
                    <span
                        key={id}
                        className="relative inline-flex items-center justify-center"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={ariaLabel}
                            disabled={disabled}
                            onClick={onClick}
                            className="peer aspect-square shrink-0 rounded-full p-0 text-muted-foreground hover:text-foreground"
                        >
                            <Icon icon={icon} />
                        </Button>
                        {!disabled ? (
                            <span className={TOOLTIP_CLASS}>{label}</span>
                        ) : null}
                    </span>
                ),
            )}
        </div>
    );
}
