import type {ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {SiteFooter} from '@pakfactory/components/layout/site-footer';
import {SiteNavRequestSlot} from '@/components/layout/site-nav-request-slot';
import {accountAvatarUrl, accountDisplayName} from '@pakfactory/supabase/session';
import {RequestRoot} from '@/lib/request/request-root';
import {buildSiteNavProps, toMarketingNavItems} from '@/lib/site-nav';
import {fetchWwwFooterData} from '@/lib/www-footer';
import {createClient} from '@pakfactory/supabase/server';

export default async function SiteLayout({children}: {children: ReactNode}) {
    let user: User | null = null;
    try {
        const supabase = await createClient();
        const {data} = await supabase.auth.getUser();
        user = data.user;
    } catch {
        user = null;
    }

    const nav = buildSiteNavProps({authenticated: Boolean(user)});
    const footer = await fetchWwwFooterData();

    return (
        <RequestRoot>
            <SiteNavRequestSlot
                homeHref={nav.homeHref}
                navItems={toMarketingNavItems(nav.items)}
                cta={nav.cta}
                signIn={nav.signIn}
                account={
                    user
                        ? {
                              displayName: accountDisplayName(user),
                              email: user.email ?? '',
                              avatarUrl: accountAvatarUrl(user),
                          }
                        : undefined
                }
            />
            {children}
            <SiteFooter
                columns={footer.columns}
                contactHref={footer.cta.href}
                contactLabel={footer.cta.label}
                social={footer.social}
                aiLinks={footer.aiLinks}
            />
        </RequestRoot>
    );
}
