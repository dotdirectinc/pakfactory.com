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
    ensureBuilderDraft,
    expandRequestProducts,
    getRequestStateServerSnapshot,
    getRequestStateSnapshot,
    removeRequestLine,
    resetExpressDraft,
    startExpressDraft,
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
    lines: RequestLine[];
    draft: RequestDraft;
    addLine: (input: AddLineInput) => RequestLine;
    removeLine: (lineId: string) => void;
    updateLine: (lineId: string, patch: UpdateLinePatch) => void;
    updateDraft: (patch: Partial<RequestDraft>) => void;
    expandProducts: () => void;
    startExpress: () => void;
    ensureBuilder: (opts?: {express?: boolean; mode?: RequestEntryKind}) => void;
    resetExpress: () => void;
};

const RequestContext = createContext<RequestContextValue | null>(null);

export function RequestProvider({children}: {children: ReactNode}) {
    const state: RequestState = useSyncExternalStore(
        subscribeRequest,
        getRequestStateSnapshot,
        getRequestStateServerSnapshot,
    );

    const addLine = useCallback((input: AddLineInput) => addRequestLine(input), []);
    const removeLine = useCallback((lineId: string) => {
        removeRequestLine(lineId);
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
    const ensureBuilder = useCallback(
        (opts?: {express?: boolean; mode?: RequestEntryKind}) => {
            ensureBuilderDraft(opts);
        },
        [],
    );
    const resetExpress = useCallback(() => {
        resetExpressDraft();
    }, []);

    const value = useMemo(
        () => ({
            lines: state.lines,
            draft: state.draft,
            addLine,
            removeLine,
            updateLine,
            updateDraft,
            expandProducts,
            startExpress,
            ensureBuilder,
            resetExpress,
        }),
        [
            state.lines,
            state.draft,
            addLine,
            removeLine,
            updateLine,
            updateDraft,
            expandProducts,
            startExpress,
            ensureBuilder,
            resetExpress,
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
