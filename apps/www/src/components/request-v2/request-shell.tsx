'use client';

import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {IntakeSignIn} from '@/components/intake/fields/intake-sign-in';
import {RequestTopBar} from '@/components/request/request-top-bar';
import {markSkipSoftPageEnter} from '@/lib/ui/skip-soft-page-enter';
import {WWW_ROUTES} from '@/lib/www-routes';

/** The request's own shell: Logo | Quote Request … Sign in | Close (no site menus). */
/** PORTABLE. */
export function RequestShell({
    children,
    onClose,
}: {
    children?: ReactNode;
    onClose?: () => void;
}) {
    const router = useRouter();

    function leave() {
        markSkipSoftPageEnter();
        if (onClose) {
            onClose();
            return;
        }
        router.push(WWW_ROUTES.home);
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <RequestTopBar
                title={<span className="truncate text-sm font-medium">Quote Request</span>}
                onLeave={leave}
                beforeClose={<IntakeSignIn variant="topbar" />}
            />
            {children}
        </div>
    );
}
