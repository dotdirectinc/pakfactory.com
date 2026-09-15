import {cn} from '@pakfactory/ui/lib/utils';

/** Black 40% circle + white icon for bookmark / compare on catalog media. */
export const mediaUtilityButtonClass = cn(
    'size-9 rounded-full border-0 shadow-none',
    'bg-black/40 text-white',
    'transition-[color,background-color,opacity] duration-300 ease-in-out',
    'hover:bg-black/50 hover:text-white',
);

export type MediaUtilityTooltipSide = 'top' | 'bottom';

export function mediaUtilityTooltipClass(
    side: MediaUtilityTooltipSide = 'bottom',
): string {
    return cn(
        'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-[13px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100',
        side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
    );
}
