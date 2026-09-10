'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import type {AccountIdentity} from '@pakfactory/supabase/session';
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
    /** The signed-in buyer, or null. Resolved on the server; never fetched here. */
    viewer: AccountIdentity | null;
};

const RequestContext = createContext<RequestContextValue | null>(null);

/**
 * `useLayoutEffect` warns when it runs during server rendering, where there is
 * no layout to read. Falling back to `useEffect` on the server keeps the console
 * clean; the seed only ever matters on the client, which has the localStorage
 * draft this reconciles against.
 */
const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function RequestProvider({
    children,
    viewer = null,
}: {
    children: ReactNode;
    viewer?: AccountIdentity | null;
}) {
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

    /**
     * Seed the draft from the account, ONCE per mount, and only into fields the
     * buyer has left empty.
     *
     * `??=`-style merging rather than assignment is the whole point: a draft is
     * restored from localStorage and may already hold a name the buyer typed —
     * possibly a colleague's, since a request can be raised on someone else's
     * behalf. Overwriting that with the account holder's name would silently
     * change who the quote is addressed to, and it would do it on every reload.
     *
     * The email is the exception and is written unconditionally: it is the
     * account's address, the field is locked to it, and `submit-request.ts`
     * attributes the RFQ to it. Letting a stale draft value survive there would
     * mean the record disagrees with the account that created it.
     */
    /**
     * LAYOUT effect, not a passive one. Effects run AFTER paint, so seeding in
     * `useEffect` paints the empty form first and collapses it a frame later —
     * a signed-in buyer watches the whole step flicker on every first visit.
     * A layout effect runs before paint, so the first thing drawn is already
     * correct.
     *
     * The draft lives in localStorage and is therefore unknowable on the server,
     * which is why this cannot simply be server-rendered: `useSyncExternalStore`
     * gives the client its real draft on the first client render, and this
     * fills the gaps before anything reaches the screen.
     */
    const seededDraftId = useRef<string | null>(null);
    useIsomorphicLayoutEffect(() => {
        if (!viewer) return;

        // Keyed on the DRAFT ID, not a boolean.
        //
        // `startExpressDraft()` replaces the draft wholesale with a fresh
        // `EMPTY_DRAFT` and a new id, and it does so from `ExpressEntry`'s
        // passive effect — which runs AFTER this layout effect. A one-shot
        // boolean therefore seeds the draft that is about to be thrown away and
        // then refuses to seed the one that replaces it, leaving the buyer
        // looking at a "Signed in as …" banner above three empty fields.
        //
        // Re-seeding per draft id also draws the line in the right place: a new
        // draft gets the account values, while clearing a field inside the
        // draft you are already editing is respected, because the id has not
        // changed.
        const draft = getRequestStateSnapshot().draft;
        if (seededDraftId.current === draft.id) return;
        seededDraftId.current = draft.id;

        const patch: Partial<RequestDraft> = {};
        if (viewer.email && draft.contactEmail !== viewer.email) {
            patch.contactEmail = viewer.email;
        }
        if (viewer.firstName && !draft.contactFirstName.trim()) {
            patch.contactFirstName = viewer.firstName;
        }
        if (viewer.lastName && !draft.contactLastName.trim()) {
            patch.contactLastName = viewer.lastName;
        }
        if (Object.keys(patch).length > 0) updateRequestDraft(patch);
    }, [viewer, state.draft.id]);

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
            viewer,
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
            viewer,
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
