import type {LucideIcon, LucideProps} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

/** Default Lucide stroke for www marketing chrome (matches nav folders). */
export const ICON_STROKE = 1.75;

type IconSize = 'sm' | 'md' | 'lg';

type IconProps = Omit<LucideProps, 'ref'> & {
    icon: LucideIcon;
    /** sm = 16px, md = 20px, lg = 24px */
    size?: IconSize;
};

const SIZE_CLASS: Record<IconSize, string> = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
};

/**
 * Shared Lucide wrapper — change {@link ICON_STROKE} / size map here to restyle
 * every migrated icon.
 */
export function Icon({
    icon: Glyph,
    size = 'sm',
    className,
    strokeWidth,
    ...props
}: IconProps) {
    return (
        <Glyph
            aria-hidden
            strokeWidth={strokeWidth ?? ICON_STROKE}
            className={cn(SIZE_CLASS[size], className)}
            {...props}
        />
    );
}
