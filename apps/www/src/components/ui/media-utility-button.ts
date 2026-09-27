import {cn} from '@pakfactory/ui/lib/utils';

/** Solid foreground circle + white icon for bookmark / compare on catalog media. */
export const mediaUtilityButtonClass = cn(
    'size-9 rounded-full border-0 shadow-none',
    'bg-foreground text-white',
    'transition-[color,background-color,opacity] duration-300 ease-in-out',
    'hover:bg-foreground hover:text-white',
);

/** Preferred side for catalog utility tips — compose with `TooltipContent variant="pill"`. */
export type MediaUtilityTooltipSide = 'top' | 'bottom';
