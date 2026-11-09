'use client';

import type {ReactNode} from 'react';
import type {AccountIdentity} from '@pakfactory/supabase/session';
import {Toaster} from '@pakfactory/ui/components/sonner';
import {QuickConfigureProvider} from '@/components/quick-configure/quick-configure';
import {RequestProvider} from '@/lib/request/request-provider';

export function RequestRoot({
    children,
    viewer = null,
}: {
    children: ReactNode;
    /** Resolved on the server in `(request)/layout.tsx`; null when signed out. */
    viewer?: AccountIdentity | null;
}) {
    return (
        <RequestProvider viewer={viewer}>
            {/* F24 Quick configure + F25 Apply popup: one drawer for the whole site. */}
            <QuickConfigureProvider>{children}</QuickConfigureProvider>
            <Toaster richColors closeButton position="bottom-right" />
        </RequestProvider>
    );
}
