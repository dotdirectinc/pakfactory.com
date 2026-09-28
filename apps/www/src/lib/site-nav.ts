import type {
  SiteNavCta,
  SiteNavItem,
  SiteNavPanel,
  SiteNavPanelGroup,
  SiteNavPanelLink,
  SiteNavPanelPromo,
} from '@pakfactory/ui/components/site-nav';
import type {
  WebsiteNavLinkDoc,
  WebsiteNavigationDoc,
} from '@pakfactory/sanity/queries';
import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';
import {sanityImageBaseUrl} from '@/lib/sanity/image';
import {WWW_ROUTES} from '@/lib/www-routes';

export type WwwSiteNavModel = {
  homeHref: string;
  items: SiteNavItem[];
  cta: SiteNavCta;
  signIn: SiteNavCta;
};

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

function mapNavLink(
  link: WebsiteNavLinkDoc | null | undefined,
): SiteNavPanelLink | null {
  if (!link?.label?.trim()) return null;
  const resolved = resolveWwwNavHref(link);
  if (!resolved?.href) return null;
  return {
    label: link.label.trim(),
    href: resolved.href,
    ...(resolved.external ? {external: true} : {}),
  };
}

function mapPromo(
  promo:
    | {
        heading?: string | null;
        image?: {
          alt?: string | null;
          [key: string]: unknown;
        } | null;
        link?: WebsiteNavLinkDoc | null;
      }
    | null
    | undefined,
): SiteNavPanelPromo | null {
  if (!promo) return null;
  const heading = promo.heading?.trim() ?? '';
  const imageUrl = promo.image ? sanityImageBaseUrl(promo.image) : undefined;
  const imageAlt = promo.image?.alt?.trim();
  const link = mapNavLink(promo.link);

  if (!heading && !imageUrl && !link?.href) return null;

  return {
    ...(heading ? {heading} : {}),
    ...(imageUrl ? {imageUrl, imageAlt: imageAlt || heading || 'Featured'} : {}),
    ...(link
      ? {href: link.href, ...(link.external ? {external: true} : {})}
      : {}),
  };
}

function mapChromeItems(chrome: WebsiteNavigationDoc): SiteNavItem[] | null {
  if (!chrome?._id || !chrome.items?.length) return null;

  const items: SiteNavItem[] = [];

  for (const item of chrome.items) {
    if (!item?.label?.trim()) continue;
    const label = item.label.trim();
    const key = slugKey(label);

    const groups: SiteNavPanelGroup[] = [];
    for (const [groupIndex, group] of (item.groups ?? []).entries()) {
      if (!group) continue;
      const links: SiteNavPanelLink[] = [];
      for (const link of group.items ?? []) {
        const mapped = mapNavLink(link);
        if (mapped) links.push(mapped);
      }
      if (links.length === 0) continue;
      const groupLabel = group.label?.trim() || label;
      groups.push({
        key: `${key}-g${groupIndex}-${slugKey(groupLabel)}`,
        label: groupLabel,
        ...(group.descriptor?.trim()
          ? {descriptor: group.descriptor.trim()}
          : {}),
        links,
      });
    }

    const promo = mapPromo(item.promo ?? null);
    const footerCta = mapNavLink(item.footerCta ?? null);
    const totalLinks = groups.reduce((n, g) => n + g.links.length, 0);
    /** One group with a single link and no promo → flat bar link (hub items). */
    const hasMega =
      Boolean(promo) ||
      Boolean(footerCta) ||
      groups.length > 1 ||
      totalLinks > 1;

    let href: string | undefined;
    if (hasMega) {
      href = fallbackHrefForLabel(label);
      if (!href) {
        for (const group of groups) {
          const first = group.links[0];
          if (first && !first.external) {
            href = first.href;
            break;
          }
        }
      }
    } else {
      href = groups[0]?.links[0]?.href;
      href ??= fallbackHrefForLabel(label);
      for (const group of item.groups ?? []) {
        if (href) break;
        for (const link of group?.items ?? []) {
          const resolved = resolveWwwNavHref(link);
          if (resolved?.href) {
            href = resolved.href;
            break;
          }
        }
      }
    }

    if (!hasMega && !href) continue;

    const panel: SiteNavPanel | undefined = hasMega
      ? {
          groups,
          ...(promo ? {promo} : {}),
          ...(footerCta ? {footerCta} : {}),
        }
      : undefined;

    items.push({
      key: key || href || label,
      label,
      ...(href ? {href} : {}),
      ...(panel ? {panel} : {}),
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
  const chromeItems = mapChromeItems(options?.chrome ?? null);
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
