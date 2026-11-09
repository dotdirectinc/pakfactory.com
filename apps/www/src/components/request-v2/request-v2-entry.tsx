'use client';

import dynamic from 'next/dynamic';
import {RequestShell} from '@/components/request-v2/request-shell';

/**
 * Client-only entries for the RFQ v2 pages (the request lives in browser storage, so these
 * render after hydration). Used only when `RFQ_V2_ENABLED` (lib/request-v2/flag.ts) is on.
 * `loading` paints the request shell while the chunk loads — no blank page / site footer flash.
 */
const shellFallback = () => <RequestShell />;

export const RequestHomeV2Entry = dynamic(
    () => import('@/components/request-v2/request-home').then((m) => m.RequestHomeV2),
    {ssr: false, loading: shellFallback},
);
export const RequestRootV2Entry = dynamic(
    () => import('@/components/request-v2/request-home').then((m) => m.RequestRootV2),
    {ssr: false, loading: shellFallback},
);
export const RequestSubmittedV2Entry = dynamic(
    () => import('@/components/request-v2/request-home').then((m) => m.RequestSubmittedV2),
    {ssr: false, loading: shellFallback},
);
