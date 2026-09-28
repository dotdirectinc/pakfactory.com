'use client';

import {useLayoutEffect, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Soft page transition for Next.js route-group templates.
 * On pathname change: scroll to top, then play page-enter
 * (`animate-page-enter` / `--motion-slow`). See DESIGN.md § Motion.
 */
export function SoftPageTransition({children}: {children: ReactNode}) {
    const pathname = usePathname();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="animate-page-enter motion-reduce:animate-none">
            {children}
        </div>
    );
}
