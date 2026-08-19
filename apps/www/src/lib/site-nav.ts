import type {SiteNavCta, SiteNavItem} from '@pakfactory/ui/components/site-nav';
import {WWW_ROUTES} from '@/lib/www-routes';

export type WwwSiteNavModel = {
    homeHref: string;
    items: SiteNavItem[];
    cta: SiteNavCta;
};

export function buildSiteNavProps(): WwwSiteNavModel {
    return {
        homeHref: WWW_ROUTES.home,
        items: [
            {
                key: 'products',
                label: 'Product',
                href: WWW_ROUTES.products,
            },
            {key: 'customization', label: 'Customization'},
            {
                key: 'solution',
                label: 'Solution',
                href: WWW_ROUTES.solutions,
            },
            {
                key: 'expertise',
                label: 'Expertise',
                href: WWW_ROUTES.expertise,
            },
        ],
        cta: {
            label: 'Get a Quote',
            href: WWW_ROUTES.contact,
        },
    };
}
