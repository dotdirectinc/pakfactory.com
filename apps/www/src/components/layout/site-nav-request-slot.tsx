'use client';

import {useLayoutEffect} from 'react';
import Link from 'next/link';
import {SiteNav, type SiteNavItem} from '@pakfactory/ui/components/site-nav';
import {AccountMenu} from '@/components/account/account-menu';
import Logo from '@/components/layout/logo';
import {MegaMenu} from '@/components/layout/mega-menu';
import {useNavAccount} from '@/lib/auth/use-nav-account';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

export type SiteNavRequestSlotProps = {
    homeHref: string;
    navItems: SiteNavItem[];
    cta: {href: string; label: string};
    /** Signed-out link ("Sign in"); the server renders this for everyone. */
    signIn: {href: string; label: string};
    /** Signed-in replacement for `signIn` in the mobile menu ("Account"). */
    accountLink: {href: string; label: string};
};

const NAV_OFFSET_FALLBACK = '4.5rem';

/**
 * Copy SiteNav's measured `--site-nav-offset` onto `:root` so below-nav
 * frames (e.g. Finder fullscreen) can use `calc(100dvh - var(--site-nav-offset))`.
 */
function useHoistSiteNavOffset() {
    useLayoutEffect(() => {
        const header = document.querySelector<HTMLElement>(
            '[data-site-nav-header]',
        );
        if (!header) {
            document.documentElement.style.setProperty(
                '--site-nav-offset',
                NAV_OFFSET_FALLBACK,
            );
            return;
        }

        const sync = () => {
            const height = header.offsetHeight;
            document.documentElement.style.setProperty(
                '--site-nav-offset',
                height > 0 ? `${height}px` : NAV_OFFSET_FALLBACK,
            );
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(header);
        return () => {
            observer.disconnect();
            document.documentElement.style.removeProperty('--site-nav-offset');
        };
    }, []);
}

/**
 * Desktop account slot while the session is still unknown. Both children are
 * rendered; CSS keyed to the pre-paint flag (`#pf-nav-session[data-session]`,
 * see lib/auth/nav-session-flag.ts + globals.css) shows the placeholder to
 * visitors with an auth cookie and "Sign in" to everyone else, so neither
 * group sees the wrong state on first paint.
 */
function PendingAccountSlot({signIn}: {signIn: {href: string; label: string}}) {
    return (
        <>
            <span className="nav-anon-only">
                {/* Same treatment as SiteNav's own signIn link (@pakfactory/ui). */}
                <Link
                    href={signIn.href}
                    className="py-2 text-base font-medium text-foreground no-underline transition-colors hover:text-foreground/80"
                >
                    {signIn.label}
                </Link>
            </span>
            <span
                className="nav-session-only size-9 items-center justify-center"
                aria-hidden
            >
                {/* Matches AccountMenu size="sm" (size-9 trigger, avatar inside). */}
                <span className="block size-8 animate-pulse rounded-full bg-muted" />
            </span>
        </>
    );
}

/** Client bridge: injects live request count + browser-resolved account into SiteNav. */
export function SiteNavRequestSlot({
    homeHref,
    navItems,
    cta,
    signIn,
    accountLink,
}: SiteNavRequestSlotProps) {
    const {lines} = useRequest();
    const session = useNavAccount();
    useHoistSiteNavOffset();

    const account =
        session.status === 'signed-in' ? (
            <AccountMenu {...session.account} size="sm" />
        ) : session.status === 'pending' ? (
            <PendingAccountSlot signIn={signIn} />
        ) : undefined;

    return (
        <SiteNav
            homeHref={homeHref}
            logo={<Logo className="gap-3" />}
            items={navItems}
            desktopNav={<MegaMenu items={navItems} />}
            cta={cta}
            signIn={session.status === 'signed-in' ? accountLink : signIn}
            account={account}
            request={{
                href: WWW_ROUTES.request,
                count: lines.length,
                label: 'Quote request',
            }}
        />
    );
}
