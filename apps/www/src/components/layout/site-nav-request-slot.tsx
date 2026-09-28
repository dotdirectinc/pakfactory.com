'use client';

import {SiteNav, type SiteNavItem} from '@pakfactory/ui/components/site-nav';
import {
    AccountMenu,
    type AccountMenuProps,
} from '@/components/account/account-menu';
import Logo from '@/components/layout/logo';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

export type SiteNavRequestSlotProps = {
    homeHref: string;
    navItems: SiteNavItem[];
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
            homeHref={homeHref}
            logo={<Logo className="gap-3" />}
            items={navItems}
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
