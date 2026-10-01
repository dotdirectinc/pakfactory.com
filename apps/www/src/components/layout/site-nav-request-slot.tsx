'use client';

import {useLayoutEffect} from 'react';
import {SiteNav, type SiteNavItem} from '@pakfactory/ui/components/site-nav';
import {
    AccountMenu,
    type AccountMenuProps,
} from '@/components/account/account-menu';
import Logo from '@/components/layout/logo';
import {MegaMenu} from '@/components/layout/mega-menu';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

export type SiteNavRequestSlotProps = {
    homeHref: string;
    navItems: SiteNavItem[];
    cta: {href: string; label: string};
    signIn: {href: string; label: string};
    account?: AccountMenuProps;
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

/** Client bridge: injects live request count into marketing SiteNav. */
export function SiteNavRequestSlot({
    homeHref,
    navItems,
    cta,
    signIn,
    account,
}: SiteNavRequestSlotProps) {
    const {lines} = useRequest();
    useHoistSiteNavOffset();

    return (
        <SiteNav
            homeHref={homeHref}
            logo={<Logo className="gap-3" />}
            items={navItems}
            desktopNav={<MegaMenu items={navItems} />}
            cta={cta}
            signIn={signIn}
            account={
                account ? <AccountMenu {...account} size="sm" /> : undefined
            }
            request={{
                href: WWW_ROUTES.request,
                count: lines.length,
                label: 'Quote request',
            }}
        />
    );
}
