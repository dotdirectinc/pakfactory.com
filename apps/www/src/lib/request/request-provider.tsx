'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import {
    addRequestLine,
    clearAllRequestLines,
    discardRequestDraft,
    ensureBuilderDraft,
    expandRequestProducts,
    getRequestStateServerSnapshot,
    getRequestStateSnapshot,
    linesForBuilder,
    removeRequestLine,
    startExpressDraft,
    startRequestFromSelection,
    subscribeRequest,
    updateRequestDraft,
    updateRequestLine,
    type AddLineInput,
    type RequestDraft,
    type RequestEntryKind,
    type RequestLine,
    type RequestState,
    type UpdateLinePatch,
} from '@/lib/request/request.storage';

type RequestContextValue = {
    /** Full Your Request pool. */
    lines: RequestLine[];
    /** Lines in scope for the Request Builder / submit. */
    builderLines: RequestLine[];
    draft: RequestDraft;
    addLine: (input: AddLineInput) => RequestLine;
    removeLine: (lineId: string) => void;
    clearAllLines: () => void;
    updateLine: (lineId: string, patch: UpdateLinePatch) => void;
    updateDraft: (patch: Partial<RequestDraft>) => void;
    expandProducts: () => void;
    startExpress: () => void;
    startFromSelection: (selectedIds: string[]) => void;
    ensureBuilder: (opts?: {express?: boolean; mode?: RequestEntryKind}) => void;
    discardDraft: () => void;
};

const RequestContext = createContext<RequestContextValue | null>(null);

export function RequestProvider({children}: {children: ReactNode}) {
    const state: RequestState = useSyncExternalStore(
        subscribeRequest,
        getRequestStateSnapshot,
        getRequestStateServerSnapshot,
    );

    const builderLines = useMemo(
        () => linesForBuilder(state.lines, state.draft),
        [state.lines, state.draft],
    );

    const addLine = useCallback((input: AddLineInput) => addRequestLine(input), []);
    const removeLine = useCallback((lineId: string) => {
        removeRequestLine(lineId);
    }, []);
    const clearAllLines = useCallback(() => {
        clearAllRequestLines();
    }, []);
    const updateLine = useCallback((lineId: string, patch: UpdateLinePatch) => {
        updateRequestLine(lineId, patch);
    }, []);
    const updateDraft = useCallback((patch: Partial<RequestDraft>) => {
        updateRequestDraft(patch);
    }, []);
    const expandProducts = useCallback(() => {
        expandRequestProducts();
    }, []);
    const startExpress = useCallback(() => {
        startExpressDraft();
    }, []);
    const startFromSelection = useCallback((selectedIds: string[]) => {
        startRequestFromSelection(selectedIds);
    }, []);
    const ensureBuilder = useCallback(
        (opts?: {express?: boolean; mode?: RequestEntryKind}) => {
            ensureBuilderDraft(opts);
        },
        [],
    );
    const discardDraft = useCallback(() => {
        discardRequestDraft();
    }, []);

    const value = useMemo(
        () => ({
            lines: state.lines,
            builderLines,
            draft: state.draft,
            addLine,
            removeLine,
            clearAllLines,
            updateLine,
            updateDraft,
            expandProducts,
            startExpress,
            startFromSelection,
            ensureBuilder,
            discardDraft,
        }),
        [
            state.lines,
            builderLines,
            state.draft,
            addLine,
            removeLine,
            clearAllLines,
            updateLine,
            updateDraft,
            expandProducts,
            startExpress,
            startFromSelection,
            ensureBuilder,
            discardDraft,
        ],
    );

    return (
        <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
    );
}

export function useRequest(): RequestContextValue {
    const ctx = useContext(RequestContext);
    if (!ctx) {
        throw new Error('useRequest must be used within RequestProvider');
    }
    return ctx;
}
