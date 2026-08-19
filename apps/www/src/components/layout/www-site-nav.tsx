'use client';

import {SiteNav, type SiteNavProps} from '@pakfactory/ui/components/site-nav';
import Logo from '@/components/layout/logo';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

export type WwwSiteNavProps = Omit<SiteNavProps, 'logo' | 'request'>;

export function WwwSiteNav(props: WwwSiteNavProps) {
    const {lines} = useRequest();

    return (
        <SiteNav
            {...props}
            logo={<Logo className="gap-3" />}
            request={{
                href: WWW_ROUTES.request,
                count: lines.length,
                label: 'Your request',
            }}
        />
    );
}
