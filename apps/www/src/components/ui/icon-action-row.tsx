'use client';

import type {LucideIcon} from 'lucide-react';
import type {MouseEvent} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

export type IconAction = {
    id: string;
    label: string;
    ariaLabel: string;
    icon: LucideIcon;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    title?: string;
};

type IconActionRowProps = {
    actions: IconAction[];
    className?: string;
};

export function IconActionRow({actions, className}: IconActionRowProps) {
    return (
        <div className={cn('-my-1.5 flex items-center gap-0.5', className)}>
            {actions.map(
                ({
                    id,
                    label,
                    ariaLabel,
                    icon: Icon,
                    onClick,
                    disabled,
                    title,
                }) => (
                    <span key={id} className="relative flex">
                        <button
                            type="button"
                            aria-label={ariaLabel}
                            title={title}
                            disabled={disabled}
                            onClick={onClick}
                            className={cn(
                                'peer flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                disabled &&
                                    'pointer-events-none cursor-not-allowed opacity-50',
                            )}
                        >
                            <Icon className="size-[18px]" aria-hidden />
                        </button>
                        {!disabled ? (
                            <span
                                className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-[13px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100"
                            >
                                {label}
                            </span>
                        ) : null}
                    </span>
                ),
            )}
        </div>
    );
}
