'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

/**
 * Grid-wide Link prefetch stays off; the tile under the pointer warms the
 * route immediately (ENGINEERING.md § Card → detail navigation).
 */
export function usePointerPrefetch(href: string): {
    prefetch: boolean;
    enablePrefetch: () => void;
} {
    const router = useRouter();
    const [prefetch, setPrefetch] = useState(false);

    function enablePrefetch() {
        void router.prefetch(href);
        setPrefetch(true);
    }

    return {prefetch, enablePrefetch};
}
