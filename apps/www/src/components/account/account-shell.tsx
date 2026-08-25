'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@pakfactory/ui/lib/utils';
import Logo from '@/components/layout/logo';
import {ACCOUNT_COPY} from '@/lib/copy/account';
import {WWW_ROUTES} from '@/lib/www-routes';

const PILLS = [
    {
        href: WWW_ROUTES.accountRequests,
        label: ACCOUNT_COPY.requestsTitle,
    },
    {
        href: WWW_ROUTES.accountProfile,
        label: ACCOUNT_COPY.profileTitle,
    },
] as const;

function isPillActive(pathname: string, href: string): boolean {
    if (href === WWW_ROUTES.accountRequests) {
        return (
            pathname === href ||
            pathname.startsWith(`${WWW_ROUTES.accountRequests}/`) ||
            pathname === WWW_ROUTES.account
        );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountShell({children}: {children: ReactNode}) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen flex-col bg-muted/30">
            <header className="border-b border-border bg-background">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link
                        href={WWW_ROUTES.home}
                        aria-label="PakFactory home"
                        className="shrink-0"
                    >
                        <Logo />
                    </Link>

                    <nav
                        aria-label="Account"
                        className="hidden items-center gap-1 rounded-full border border-border bg-muted/40 p-1 sm:flex"
                    >
                        {PILLS.map((pill) => {
                            const active = isPillActive(pathname, pill.href);
                            return (
                                <Link
                                    key={pill.href}
                                    href={pill.href}
                                    className={cn(
                                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    {pill.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <Link
                        href={WWW_ROUTES.login}
                        className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                        {ACCOUNT_COPY.signOut}
                    </Link>
                </div>

                <nav
                    aria-label="Account mobile"
                    className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 sm:hidden"
                >
                    {PILLS.map((pill) => {
                        const active = isPillActive(pathname, pill.href);
                        return (
                            <Link
                                key={pill.href}
                                href={pill.href}
                                className={cn(
                                    'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                                    active
                                        ? 'bg-foreground text-background'
                                        : 'bg-muted text-muted-foreground',
                                )}
                                aria-current={active ? 'page' : undefined}
                            >
                                {pill.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
                {children}
            </div>
        </div>
    );
}
