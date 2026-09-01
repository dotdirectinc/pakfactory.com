'use client';

import {useEffect, useState} from 'react';
import {BriefBuilder} from '@/components/request/brief-builder';
import {ExpressPoolDialog} from '@/components/request/express-pool-dialog';
import {useRequest} from '@/lib/request/request-provider';

type EntryPhase = 'deciding' | 'prompting' | 'started';

export function ExpressEntry() {
    const {lines, draft, ensureBuilder, expandProducts} = useRequest();
    const [phase, setPhase] = useState<EntryPhase>('deciding');
    const [poolCount, setPoolCount] = useState(0);

    // The pool only exists in localStorage, so it is unknown until after
    // hydration. Deciding here — rather than during render — keeps the first
    // client render identical to the server markup.
    useEffect(() => {
        if (phase !== 'deciding') return;
        if (lines.length > 0 && draft.entryKind !== 'express') {
            setPoolCount(lines.length);
            setPhase('prompting');
            return;
        }
        ensureBuilder({mode: 'express'});
        setPhase('started');
    }, [phase, lines, draft.entryKind, ensureBuilder]);

    function includeProducts() {
        ensureBuilder({mode: 'express'});
        expandProducts();
        setPhase('started');
    }

    function requirementsOnly() {
        ensureBuilder({mode: 'express'});
        setPhase('started');
    }

    return (
        <>
            <BriefBuilder mode="express" deferStart={phase !== 'started'} />
            <ExpressPoolDialog
                open={phase === 'prompting'}
                count={poolCount}
                onInclude={includeProducts}
                onRequirementsOnly={requirementsOnly}
            />
        </>
    );
}
