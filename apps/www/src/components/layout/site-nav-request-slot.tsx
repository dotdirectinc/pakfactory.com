'use client';

import type {PrimaryNavItem} from '@pakfactory/components/layout/primary-nav-types';
import {SiteNav} from '@pakfactory/components/layout/site-nav';
import {
    AccountMenu,
    type AccountMenuProps,
} from '@/components/account/account-menu';
import Logo from '@/components/layout/logo';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

export type SiteNavRequestSlotProps = {
    homeHref: string;
    navItems: PrimaryNavItem[];
    cta: {href: string; label: string};
    signIn: {href: string; label: string};
    account?: AccountMenuProps;
};

/** Client bridge: injects live request count into marketing SiteNav. */
export function SiteNavRequestSlot({
    homeHref,
    navItems,
    cta,
    signIn,
    account,
}: SiteNavRequestSlotProps) {
    const {lines} = useRequest();

    return (
        <SiteNav
            variant="marketing"
            homeHref={homeHref}
            logo={<Logo className="gap-3" />}
            navItems={navItems}
            cta={cta}
            signIn={signIn}
            account={
                account ? <AccountMenu {...account} size="sm" /> : undefined
            }
            request={{
                href: WWW_ROUTES.request,
                count: lines.length,
                label: 'Your request',
            }}
        />
    );
}
