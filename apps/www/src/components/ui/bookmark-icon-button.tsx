'use client';

import type {MouseEvent} from 'react';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';
import {
    mediaUtilityButtonClass,
    mediaUtilityTooltipClass,
    type MediaUtilityTooltipSide,
} from '@/components/ui/media-utility-button';

type BookmarkIconButtonProps = {
    pressed?: boolean;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    ariaLabel?: string;
    className?: string;
    tooltipSide?: MediaUtilityTooltipSide;
};

export function BookmarkIconButton({
    pressed = false,
    onClick,
    ariaLabel,
    className,
    tooltipSide = 'bottom',
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
                    'peer',
                    mediaUtilityButtonClass,
                    pressed && 'bg-background text-primary',
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
            <span className={mediaUtilityTooltipClass(tooltipSide)}>
                {tooltipLabel}
            </span>
        </span>
    );
}
