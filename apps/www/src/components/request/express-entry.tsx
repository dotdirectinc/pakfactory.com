'use client';

import {useEffect, useRef} from 'react';
import dynamic from 'next/dynamic';
import {useRequest} from '@/lib/request/request-provider';

const BriefBuilder = dynamic(
    () =>
        import('@/components/request/brief-builder').then(
            (mod) => mod.BriefBuilder,
        ),
    {ssr: false},
);

/**
 * Get a quote (/request/general): always open express requirements-only.
 * Saved pool products are offered via an inline banner in the builder, not a modal.
 */
export function ExpressEntry() {
    const {startExpress} = useRequest();
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        startExpress();
    }, [startExpress]);

    return <BriefBuilder mode="express" />;
}
