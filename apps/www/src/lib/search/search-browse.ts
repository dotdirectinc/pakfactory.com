import {BLOG_URL} from '@/lib/www-nav';
import {WWW_ROUTES} from '@/lib/www-routes';

import type {SearchGroup} from './search-query';

/**
 * Fixed copy for the ⌘K dialog's empty state (PROD-3111): curated chips and the
 * browse links per rail tab. Chips are the POC's list
 * (pakfactory.com-poc `search-index.js` SUGGESTION_CHIPS).
 */

export const CURATED_CHIPS = [
    'brown box',
    'kraft',
    'foil stamping',
    'mailer',
    'soft-touch',
    'rigid',
    'cosmetics',
    'gift',
] as const;

export const MAX_CHIPS = 8;

export type BrowseLink = {label: string; href: string};

export const BROWSE_LINKS: Record<SearchGroup, BrowseLink[]> = {
    products: [{label: 'All products', href: WWW_ROUTES.products}],
    solutions: [{label: 'All solutions', href: WWW_ROUTES.solutions}],
    customizations: [
        {label: 'All customizations', href: WWW_ROUTES.customizations},
        {
            label: 'Compatibility',
            href: `${WWW_ROUTES.customizations}/compatibility`,
        },
    ],
    guides: [{label: 'All guides', href: BLOG_URL}],
    resources: [
        {label: 'Case studies', href: WWW_ROUTES.caseStudies},
        {label: 'Expertise', href: WWW_ROUTES.expertise},
        {label: 'Newsroom', href: WWW_ROUTES.newsroom},
    ],
};

export const GROUP_LABELS: Record<SearchGroup, string> = {
    products: 'Products',
    solutions: 'Solutions',
    customizations: 'Customizations',
    guides: 'Guides',
    resources: 'Resources',
};

/** Small label on a result card; `site_search` types → copy. */
export const TYPE_LABELS: Record<string, string> = {
    product: 'Product',
    'product-line': 'Product line',
    'product-style': 'Style',
    customization: 'Customization',
    solution: 'Solution',
    'solution-style': 'Solution',
    guide: 'Guide',
    'case-study': 'Case study',
    expertise: 'Expertise',
    'press-release': 'Press release',
};
