import type {PrimaryNavItem} from '@pakfactory/components/layout/primary-nav-types';
import type {SiteNavCta, SiteNavItem} from '@pakfactory/ui/components/site-nav';
import type {WebsiteNavigationDoc} from '@pakfactory/sanity/queries';
import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';
import {WWW_ROUTES} from '@/lib/www-routes';

export type WwwSiteNavModel = {
  homeHref: string;
  items: SiteNavItem[];
  cta: SiteNavCta;
  signIn: SiteNavCta;
};

export function toMarketingNavItems(items: SiteNavItem[]): PrimaryNavItem[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    href: item.href ?? WWW_ROUTES.customizations,
  }));
}

const LABEL_ROUTE_FALLBACK: Record<string, string> = {
  product: WWW_ROUTES.products,
  products: WWW_ROUTES.products,
  customization: WWW_ROUTES.customizations,
  customizations: WWW_ROUTES.customizations,
  solution: WWW_ROUTES.solutions,
  solutions: WWW_ROUTES.solutions,
  expertise: WWW_ROUTES.expertise,
};

function slugKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fallbackHrefForLabel(label: string): string | undefined {
  return LABEL_ROUTE_FALLBACK[label.trim().toLowerCase()];
}

function flattenChromeItems(
  chrome: WebsiteNavigationDoc,
): SiteNavItem[] | null {
  if (!chrome?._id || !chrome.items?.length) return null;

  const items: SiteNavItem[] = [];

  for (const item of chrome.items) {
    if (!item?.label?.trim()) continue;
    const label = item.label.trim();
    let href: string | undefined;

    for (const group of item.groups ?? []) {
      if (!group?.items) continue;
      for (const link of group.items) {
        const resolved = resolveWwwNavHref(link);
        if (resolved?.href) {
          href = resolved.href;
          break;
        }
      }
      if (href) break;
    }

    href ??= fallbackHrefForLabel(label);
    if (!href) continue;

    items.push({
      key: slugKey(label) || href,
      label,
      href,
    });
  }

  return items.length > 0 ? items : null;
}

function resolveChromeCta(chrome: WebsiteNavigationDoc): SiteNavCta | null {
  if (!chrome?._id || !chrome.cta) return null;
  const label = chrome.cta.label?.trim();
  if (!label) return null;
  const resolved = resolveWwwNavHref(chrome.cta);
  if (!resolved?.href) return null;
  return {label, href: resolved.href};
}

const HARDCODED_ITEMS: SiteNavItem[] = [
  {key: 'products', label: 'Product', href: WWW_ROUTES.products},
  {
    key: 'customization',
    label: 'Customization',
    href: WWW_ROUTES.customizations,
  },
  {key: 'solution', label: 'Solution', href: WWW_ROUTES.solutions},
  {key: 'expertise', label: 'Expertise', href: WWW_ROUTES.expertise},
];

const HARDCODED_CTA: SiteNavCta = {
  label: 'Get a Quote',
  href: WWW_ROUTES.requestExpress,
};

export function buildSiteNavProps(options?: {
  authenticated?: boolean;
  chrome?: WebsiteNavigationDoc;
}): WwwSiteNavModel {
  const authenticated = Boolean(options?.authenticated);
  const chromeItems = flattenChromeItems(options?.chrome ?? null);
  const chromeCta = resolveChromeCta(options?.chrome ?? null);

  return {
    homeHref: WWW_ROUTES.home,
    items: chromeItems ?? HARDCODED_ITEMS,
    signIn: authenticated
      ? {
          label: 'Account',
          href: WWW_ROUTES.account,
        }
      : {
          label: 'Sign in',
          href: WWW_ROUTES.login,
        },
    cta: chromeCta ?? HARDCODED_CTA,
  };
}
