'use client';

import type {ReactNode} from 'react';
import type {AccountIdentity} from '@pakfactory/supabase/session';
import {Toaster} from '@pakfactory/ui/components/sonner';
import {ChatFab} from '@/components/chat/chat-fab';
import {CompareBar} from '@/components/compare/compare-bar';
import {QuickConfigureProvider} from '@/components/quick-configure/quick-configure';
import {RequestProvider} from '@/lib/request/request-provider';

/**
 * Site-wide request shell: provider + compare dock + chat + toaster.
 * Mounted once from the root layout so `(site)` ↔ `(request)` ↔ `(compare)`
 * do not remount it (signed-in Close→home stays smooth). Viewer prefill for
 * quote flows uses {@link RequestViewerSync} from `(request)/layout`.
 */
export function RequestRoot({
    children,
    viewer = null,
}: {
    children: ReactNode;
    /** Optional; prefer RequestViewerSync from the request layout. */
    viewer?: AccountIdentity | null;
}) {
    return (
        <RequestProvider viewer={viewer}>
            {/* F24 Quick configure + F25 Apply popup: one drawer for the whole site. */}
            <QuickConfigureProvider>
                {children}
                {/* R45 (PRD v4.6): site-wide compare bar ↔ round button (Guided). */}
                <CompareBar guided />
                {/* Site chat (Intercom at launch; Global Settings → Integrations). */}
                <ChatFab />
            </QuickConfigureProvider>
            <Toaster richColors closeButton position="bottom-center" />
        </RequestProvider>
    );
}

export {RequestViewerSync} from '@/lib/request/request-provider';
