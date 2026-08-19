import type {ReactNode} from 'react';
import {WwwSiteNav} from '@/components/layout/www-site-nav';
import {RequestRoot} from '@/lib/request/request-root';
import {buildSiteNavProps} from '@/lib/site-nav';

export default function SiteLayout({children}: {children: ReactNode}) {
    const nav = buildSiteNavProps();

    return (
        <RequestRoot>
            <WwwSiteNav {...nav} />
            {children}
        </RequestRoot>
    );
}
