'use client';

import type {MouseEvent} from 'react';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@pakfactory/ui/components/tooltip';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';
import {
    mediaUtilityButtonClass,
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
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={accessibleLabel}
                    aria-pressed={pressed}
                    className={cn(mediaUtilityButtonClass, className)}
                    onClick={onClick}
                >
                    <Icon
                        icon={Bookmark}
                        className={cn(pressed && 'fill-white text-white')}
                    />
                </Button>
            </TooltipTrigger>
            <TooltipContent
                side={tooltipSide}
                sideOffset={8}
                variant="pill"
            >
                {tooltipLabel}
            </TooltipContent>
        </Tooltip>
    );
}
