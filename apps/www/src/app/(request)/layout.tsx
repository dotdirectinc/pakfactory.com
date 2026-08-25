import type {ReactNode} from 'react';
import {RequestRoot} from '@/lib/request/request-root';

/** Isolated wizard chrome — no site nav (POC BriefBuilder / Request Builder). */
export default function RequestLayout({children}: {children: ReactNode}) {
    return <RequestRoot>{children}</RequestRoot>;
}
