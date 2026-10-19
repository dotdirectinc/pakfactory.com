'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

/**
 * Open state for the www ⌘K search (PROD-3111), shared by the header trigger
 * and the dialog. Owns the ⌘K / Ctrl+K shortcut. Mirrors admin's
 * `AdminSearchProvider`, minus its scopes.
 */

type SiteSearchContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const SiteSearchContext = createContext<SiteSearchContextValue | null>(null);

export function SiteSearchProvider({children}: {children: ReactNode}) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((value) => !value), []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== 'k') return;
            if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
            event.preventDefault();
            toggle();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggle]);

    const value = useMemo(() => ({open, setOpen, toggle}), [open, toggle]);
    return <SiteSearchContext.Provider value={value}>{children}</SiteSearchContext.Provider>;
}

export function useSiteSearchOpen(): SiteSearchContextValue {
    const value = useContext(SiteSearchContext);
    if (!value) throw new Error('useSiteSearchOpen must be used inside <SiteSearchProvider>');
    return value;
}
