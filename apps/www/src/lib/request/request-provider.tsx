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
    getRequestServerSnapshot,
    getRequestSnapshot,
    subscribeRequest,
    type AddLineInput,
    type RequestLine,
} from '@/lib/request/request.storage';

type RequestContextValue = {
    lines: RequestLine[];
    addLine: (input: AddLineInput) => RequestLine;
};

const RequestContext = createContext<RequestContextValue | null>(null);

export function RequestProvider({children}: {children: ReactNode}) {
    const lines = useSyncExternalStore(
        subscribeRequest,
        getRequestSnapshot,
        getRequestServerSnapshot,
    );

    const addLine = useCallback((input: AddLineInput) => addRequestLine(input), []);

    const value = useMemo(() => ({lines, addLine}), [lines, addLine]);

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
