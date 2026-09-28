'use client';

import type {ReactNode} from 'react';

import {cn} from '@pakfactory/ui/lib/utils';

import {sectionRevealProps} from '@/lib/ui/heading-settle';
import {usePathSettleOnce} from '@/lib/ui/path-settle-once';

type SectionRevealProps = {
    children: ReactNode;
    /** Override delay; default is {@link AFTER_HEADING_SETTLE_DELAY_MS} (200ms). */
    delayMs?: number;
    /**
     * Force settle on/off. When omitted or true, AND with once-per-path
     * (skip on Back / revisit). Pass `false` to disable always.
     */
    enabled?: boolean;
    /** Merged with settle animation classes (e.g. panel `flex flex-col gap-8`). */
    className?: string;
};

/**
 * Delayed heading-settle for section **content** inside a visible shell.
 * Thin client gate: plays once per pathname per tab (sessionStorage); Back
 * skips. Keep `PageDielineSection` (or other chrome) outside this wrapper so
 * rails stay opaque during the delay. Children passed from a server parent
 * remain RSC slots. See DESIGN.md § Motion.
 */
export function SectionReveal({
    children,
    delayMs,
    enabled: enabledProp = true,
    className,
}: SectionRevealProps) {
    const pathSettle = usePathSettleOnce();
    const enabled = enabledProp && pathSettle.enabled;
    const settle = sectionRevealProps({delayMs, enabled});
    return (
        <div {...settle} className={cn(settle.className, className)}>
            {children}
        </div>
    );
}
