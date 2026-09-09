'use client';

import {useEffect, useRef} from 'react';
import {BriefBuilder} from '@/components/request/brief-builder';
import {useRequest} from '@/lib/request/request-provider';

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
