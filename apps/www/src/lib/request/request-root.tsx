'use client';

import type {ReactNode} from 'react';
import {Toaster} from '@pakfactory/ui/components/sonner';
import {RequestProvider} from '@/lib/request/request-provider';

export function RequestRoot({children}: {children: ReactNode}) {
    return (
        <RequestProvider>
            {children}
            <Toaster richColors closeButton position="bottom-right" />
        </RequestProvider>
    );
}
