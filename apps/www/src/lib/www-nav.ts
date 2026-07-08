import type { NavLink } from "@pakfactory/ui/components/site-nav";
import type { SiteFooterColumns } from "@pakfactory/ui/components/site-footer";
import { getSiteUrl } from "@/lib/site";

const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://blog.pakfactory.com";
const WWW_URL = getSiteUrl();

/**
 * Soft-launch nav: only live, publicly indexed destinations.
 * Swap to FULL_NAV_LINKS at full www launch (config change only).
 */
export const SOFT_LAUNCH_NAV_LINKS: NavLink[] = [
  { href: BLOG_URL, label: "Blog" },
  { href: `${WWW_URL}/case-studies`, label: "Case Studies" },
];

export const SOFT_LAUNCH_FOOTER_COLUMNS: SiteFooterColumns = [
  [
    {
      title: "Explore",
      links: [
        { label: "Blog", href: BLOG_URL, external: true },
        { label: "Case Studies", href: `${WWW_URL}/case-studies` },
      ],
    },
  ],
  [
    {
      title: "Company",
      links: [
        { label: "Contact Us", href: `${WWW_URL}/contact`, external: true },
      ],
    },
  ],
  [
    {
      title: "Resources",
      links: [
        { label: "Get A Quote", href: `${WWW_URL}/contact`, external: true },
      ],
    },
  ],
];
