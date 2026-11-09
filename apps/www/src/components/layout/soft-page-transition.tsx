'use client';

import {useLayoutEffect, useState, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

import {consumeSkipSoftPageEnter} from '@/lib/ui/skip-soft-page-enter';

/**
 * Soft page transition for Next.js route-group templates.
 * On pathname change: scroll to top, then play page-enter
 * (`animate-page-enter` / `--motion-slow`). See DESIGN.md § Motion.
 *
 * After leaving a chrome-less tool shell, enter is skipped once so content
 * does not rise under the sticky site nav.
 */
export function SoftPageTransition({children}: {children: ReactNode}) {
    const pathname = usePathname();
    const [skipEnter] = useState(() => consumeSkipSoftPageEnter());

    useLayoutEffect(() => {
        // Returning from a chrome-less tool shell: keep scroll (popup-dismiss feel), no top jump.
        if (skipEnter) return;
        window.scrollTo(0, 0);
    }, [pathname, skipEnter]);

    return (
        <div
            className={
                skipEnter
                    ? undefined
                    : 'animate-page-enter motion-reduce:animate-none'
            }
        >
            {children}
        </div>
    );
}
