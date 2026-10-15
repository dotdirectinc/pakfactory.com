import type {ReactNode} from 'react';
import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type ArrowLinkProps = {
    href: string;
    children: ReactNode;
    /** `base` = section CTA (SectionHeading); `sm` = row / card action. */
    size?: 'sm' | 'base';
    /** Screen-reader suffix so repeated "Read more" links stay distinct. */
    srSuffix?: string;
    className?: string;
};

/**
 * Text link with a trailing chevron — ink colour, underline on hover, chevron
 * nudges right. Props-only (ADR-013); the SectionHeading CTA and list-row
 * "Read more" links share it.
 */
export function ArrowLink({
    href,
    children,
    size = 'base',
    srSuffix,
    className,
}: ArrowLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group inline-flex w-fit shrink-0 items-center gap-2 font-medium text-foreground',
                size === 'sm' ? 'text-sm' : 'text-base',
                className,
            )}
        >
            <span className="underline-offset-4 group-hover:underline">
                {children}
            </span>
            <Icon
                icon={ChevronRight}
                size="sm"
                className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
            {srSuffix ? <span className="sr-only">: {srSuffix}</span> : null}
        </Link>
    );
}
