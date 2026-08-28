import type {ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {WwwSiteNav} from '@/components/layout/www-site-nav';
import {accountAvatarUrl, accountDisplayName} from '@pakfactory/supabase/session';
import {RequestRoot} from '@/lib/request/request-root';
import {buildSiteNavProps} from '@/lib/site-nav';
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

    return (
        <RequestRoot>
            <WwwSiteNav
                {...nav}
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
        </RequestRoot>
    );
}
