import type {ReactNode} from 'react';
import Link from 'next/link';
import {ArrowRight, ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type ArrowLinkProps = {
    href: string;
    children: ReactNode;
    /** `base` = section CTA (SectionHeading); `sm` = row / card action. */
    size?: 'sm' | 'base';
    /** `chevron` (default) = section CTA; `arrow` = list-row "Read more →". */
    icon?: 'chevron' | 'arrow';
    /** Screen-reader suffix so repeated "Read more" links stay distinct. */
    srSuffix?: string;
    className?: string;
};

/**
 * Text link with a trailing chevron or arrow — ink colour, underline on hover,
 * icon nudges right. Props-only (ADR-013); the SectionHeading CTA and list-row
 * "Read more" links share it.
 */
export function ArrowLink({
    href,
    children,
    size = 'base',
    icon = 'chevron',
    srSuffix,
    className,
}: ArrowLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group inline-flex w-fit shrink-0 items-center text-foreground',
                icon === 'arrow' ? 'gap-1 font-semibold' : 'gap-2 font-medium',
                size === 'sm' ? 'text-sm' : 'text-base',
                className,
            )}
        >
            <span className="underline-offset-4 group-hover:underline">
                {children}
            </span>
            <Icon
                icon={icon === 'arrow' ? ArrowRight : ChevronRight}
                size="sm"
                className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
            {srSuffix ? <span className="sr-only">: {srSuffix}</span> : null}
        </Link>
    );
}
