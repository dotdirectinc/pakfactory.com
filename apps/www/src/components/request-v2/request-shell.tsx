'use client';

import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {IntakeSignIn} from '@/components/intake/fields/intake-sign-in';
import {WizardTopBar} from '@/components/request/wizard-top-bar';
import {WWW_ROUTES} from '@/lib/www-routes';

/** The request's own shell: Logo | Quote Request … Sign in | Close (no site menus). */
/** PORTABLE. */
export function RequestShell({children, onClose}: {children: ReactNode; onClose?: () => void}) {
    const router = useRouter();
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <WizardTopBar
                title={<span className="truncate text-sm font-medium">Quote Request</span>}
                onLeave={onClose ?? (() => router.push(WWW_ROUTES.home))}
                beforeClose={<IntakeSignIn variant="topbar" />}
                roundClose
            />
            {children}
        </div>
    );
}

