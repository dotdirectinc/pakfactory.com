'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {AccountMenu} from '@/components/account/account-menu';
import {TypewriterText} from '@/components/account/typewriter-text';
import {LogoMark} from '@/components/layout/logo-mark';
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
        <div className="flex min-h-screen flex-col bg-muted/30">
            <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
                <Link
                    href={WWW_ROUTES.home}
                    aria-label="PakFactory home"
                    className="shrink-0"
                >
                    <LogoMark className="size-7" label="PakFactory" />
                </Link>
                <span className="hidden min-w-0 truncate text-sm font-medium sm:inline">
                    {ACCOUNT_COPY.welcomeBack}{' '}
                    <TypewriterText text={displayName} />
                </span>

                <div className="ml-auto flex shrink-0 items-center gap-3">
                    <AccountMenu
                        displayName={displayName}
                        email={email}
                        avatarUrl={avatarUrl}
                    />
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                {children}
            </div>
        </div>
    );
}
