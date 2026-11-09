import type {ReactNode} from 'react';

import {RequestRoot} from '@/lib/request/request-root';

/**
 * Chrome-less compare shell — no site nav / footer. RequestRoot keeps Add to Quote,
 * Apply, and the dock (hidden while on /compare) available.
 */
export default function CompareLayout({children}: {children: ReactNode}) {
    return <RequestRoot>{children}</RequestRoot>;
}
