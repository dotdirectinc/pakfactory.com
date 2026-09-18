'use client';

import {useEffect, useState} from 'react';

const DEFAULT_DELAY_MS = 350;

type UseCatalogSearchDraftOptions = {
    /** Committed search string (URL `q` or localQuery). */
    committedQuery: string;
    /** Persist draft after debounce (URL replace / setLocalQuery). */
    onCommit: (q: string) => void;
    delayMs?: number;
};

/**
 * Keeps the search input snappy: draft updates immediately; URL/local commit
 * is debounced so router.replace is not called on every keystroke.
 */
export function useCatalogSearchDraft({
    committedQuery,
    onCommit,
    delayMs = DEFAULT_DELAY_MS,
}: UseCatalogSearchDraftOptions): {
    draftQuery: string;
    setDraftQuery: (q: string) => void;
} {
    const [draftQuery, setDraftQuery] = useState(committedQuery);

    // Re-seed when Clear / back-forward / category reset updates the committed q.
    useEffect(() => {
        setDraftQuery(committedQuery);
    }, [committedQuery]);

    useEffect(() => {
        if (draftQuery === committedQuery) return;
        const id = setTimeout(() => {
            onCommit(draftQuery);
        }, delayMs);
        return () => clearTimeout(id);
    }, [draftQuery, committedQuery, onCommit, delayMs]);

    return {draftQuery, setDraftQuery};
}
