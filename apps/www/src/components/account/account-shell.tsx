'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {AccountMenu} from '@/components/account/account-menu';
import {TypewriterText} from '@/components/account/typewriter-text';
import Logo from '@/components/layout/logo';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

export function AccountShell({
    children,
    displayName,
    email,
    avatarUrl,
}: {
    children: ReactNode;
    /** Resolved by the gating layout, which already has the session. */
    displayName: string;
    email: string;
    /** The login provider's photo, when the session came with one. */
    avatarUrl?: string;
}) {
    return (
        <div className="flex h-dvh flex-col bg-muted">
            <header className="z-20 flex h-16 shrink-0 items-center gap-2 bg-muted px-4 sm:gap-4 sm:px-6 lg:px-8">
                <Link
                    href={WWW_ROUTES.home}
                    aria-label="PakFactory home"
                    className="shrink-0"
                >
                    <Logo />
                </Link>
                <span
                    className="hidden h-4 w-px shrink-0 bg-border sm:block"
                    aria-hidden
                />
                <span className="min-w-0 truncate text-sm font-medium">
                    <span className="hidden sm:inline">
                        {ACCOUNT_COPY.welcomeBack}{' '}
                    </span>
                    <TypewriterText text={displayName} />
                </span>

                <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
                    <AccountMenu
                        displayName={displayName}
                        email={email}
                        avatarUrl={avatarUrl}
                    />
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-auto rounded-t-xl bg-background px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
        </div>
    );
}
