'use client';

import dynamic from 'next/dynamic';
import {RequestShell} from '@/components/request-sections/request-shell';

/**
 * Client-only entries for the request pages (the request lives in browser storage, so these
 * render after hydration). `loading` paints the request shell while the chunk loads — no blank
 * page / site footer flash.
 */
const shellFallback = () => <RequestShell />;

export const RequestHomeEntry = dynamic(
    () => import('@/components/request-sections/request-home').then((m) => m.RequestHome),
    {ssr: false, loading: shellFallback},
);
export const RequestRootEntry = dynamic(
    () => import('@/components/request-sections/request-home').then((m) => m.RequestRoot),
    {ssr: false, loading: shellFallback},
);
export const RequestSubmittedEntry = dynamic(
    () => import('@/components/request-sections/request-home').then((m) => m.RequestSubmitted),
    {ssr: false, loading: shellFallback},
);
