'use client';

import type {MouseEvent} from 'react';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';

type BookmarkIconButtonProps = {
    pressed?: boolean;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    ariaLabel?: string;
    className?: string;
};

const TOOLTIP_CLASS =
    'pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-[13px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100';

export function BookmarkIconButton({
    pressed = false,
    onClick,
    ariaLabel,
    className,
}: BookmarkIconButtonProps) {
    const accessibleLabel =
        ariaLabel ?? (pressed ? 'Remove bookmark' : 'Bookmark');
    const tooltipLabel = pressed ? 'Remove' : 'Save';

    return (
        <span className="relative flex">
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={accessibleLabel}
                aria-pressed={pressed}
                className={cn(
                    'peer size-8 rounded-full border-0 shadow-none',
                    'bg-background/40 text-foreground/70 backdrop-blur-sm',
                    'transition-[color,background-color,opacity] duration-300 ease-in-out',
                    'hover:bg-background/55 hover:text-foreground',
                    pressed && 'bg-background/50 text-primary',
                    className,
                )}
                onClick={onClick}
            >
                <Icon
                    icon={Bookmark}
                    className={cn(
                        pressed ? 'fill-primary text-primary' : 'opacity-80',
                    )}
                />
            </Button>
            <span className={TOOLTIP_CLASS}>{tooltipLabel}</span>
        </span>
    );
}
