'use client';

import type {ReactNode} from 'react';
import type {AccountIdentity} from '@pakfactory/supabase/session';
import {Toaster} from '@pakfactory/ui/components/sonner';
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
            {children}
            <Toaster richColors closeButton position="bottom-right" />
        </RequestProvider>
    );
}
