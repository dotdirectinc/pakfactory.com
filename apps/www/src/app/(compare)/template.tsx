'use client';

import {useLayoutEffect, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Remounts on soft navigations within `(compare)` so the chrome-less page
 * fades in like a modal sheet (`animate-compare-modal-enter`). Scroll resets
 * to top. Site SoftPageTransition is unchanged.
 */
export default function CompareTemplate({children}: {children: ReactNode}) {
    const pathname = usePathname();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="animate-compare-modal-enter motion-reduce:animate-none">
            {children}
        </div>
    );
}
