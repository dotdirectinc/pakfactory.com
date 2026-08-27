import type {ReactNode} from 'react';
import {WwwSiteNav} from '@/components/layout/www-site-nav';
import {RequestRoot} from '@/lib/request/request-root';
import {buildSiteNavProps} from '@/lib/site-nav';
import {createClient} from '@/lib/supabase/server';

export default async function SiteLayout({children}: {children: ReactNode}) {
    let authenticated = false;
    try {
        const supabase = await createClient();
        const {data} = await supabase.auth.getUser();
        authenticated = Boolean(data.user);
    } catch {
        authenticated = false;
    }

    const nav = buildSiteNavProps({authenticated});

    return (
        <RequestRoot>
            <WwwSiteNav {...nav} />
            {children}
        </RequestRoot>
    );
}
