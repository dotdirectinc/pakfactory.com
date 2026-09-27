'use client';

import type {LucideIcon} from 'lucide-react';
import type {MouseEvent} from 'react';
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
    /** `media` matches bookmark frosted circles on catalog tiles. */
    variant?: 'ghost' | 'media';
    tooltipSide?: MediaUtilityTooltipSide;
};

export function IconActionRow({
    actions,
    className,
    variant = 'ghost',
    tooltipSide = 'bottom',
}: IconActionRowProps) {
    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {actions.map(
                ({id, label, ariaLabel, icon, onClick, disabled}) => {
                    const button = (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={ariaLabel}
                            disabled={disabled}
                            onClick={onClick}
                            className={cn(
                                'aspect-square shrink-0 rounded-full p-0',
                                variant === 'media'
                                    ? mediaUtilityButtonClass
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon icon={icon} />
                        </Button>
                    );

                    if (disabled) {
                        return (
                            <span
                                key={id}
                                className="inline-flex items-center justify-center"
                            >
                                {button}
                            </span>
                        );
                    }

                    return (
                        <Tooltip key={id}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent
                                side={tooltipSide}
                                sideOffset={8}
                                variant="pill"
                            >
                                {label}
                            </TooltipContent>
                        </Tooltip>
                    );
                },
            )}
        </div>
    );
}
