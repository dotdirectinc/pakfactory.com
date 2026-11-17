'use client';

import type {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {IntakeSignIn} from '@/components/intake/fields/intake-sign-in';
import {RequestTopBar} from '@/components/request/request-top-bar';
import {leaveToolShell} from '@/lib/ui/tool-shell-return';

/** The request's own shell: Logo | title … Sign in | Close. */
/** PORTABLE. */
export function RequestShell({
    children,
    onClose,
    title = 'Quote Request',
}: {
    children?: ReactNode;
    onClose?: () => void;
    /** Top-bar flow name. Defaults to Quote Request. */
    title?: string;
}) {
    const router = useRouter();

    function leave() {
        if (onClose) {
            onClose();
            return;
        }
        leaveToolShell(router);
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <RequestTopBar
                title={<span className="truncate text-sm font-medium">{title}</span>}
                onLeave={leave}
                beforeClose={<IntakeSignIn variant="topbar" />}
            />
            {children}
        </div>
    );
}
