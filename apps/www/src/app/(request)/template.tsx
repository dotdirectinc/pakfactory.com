'use client';

import {useLayoutEffect, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Remounts on soft navigations within `(request)` so the chrome-less quote
 * shell settles in like a modal (`animate-shell-modal-enter`). Scroll resets
 * to top. Site SoftPageTransition is unchanged — see DESIGN.md § Motion.
 */
export default function RequestTemplate({children}: {children: ReactNode}) {
    const pathname = usePathname();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="animate-shell-modal-enter motion-reduce:animate-none">
            {children}
        </div>
    );
}
