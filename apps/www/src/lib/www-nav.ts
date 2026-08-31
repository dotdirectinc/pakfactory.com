import type { PrimaryNavItem } from "@pakfactory/components/layout/primary-nav-types";
import type {
  AiLink,
  FooterColumns,
  FooterLink,
  SocialLink,
} from "@pakfactory/components/layout/site-footer";
import { getWwwUrl } from "@/lib/site";
import { policyHref, WWW_ROUTES } from "@/lib/www-routes";

// Released blog lives at pakfactory.com/blog. The old blog.pakfactory.com
// subdomain 301-redirects to the blog home and drops the path, so links must
// use the /blog path form.
export const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ?? "https://pakfactory.com/blog";
const WWW_URL = getWwwUrl();

export const BLOG_NAV_FALLBACK: PrimaryNavItem[] = [
  {
    key: "design-and-structure",
    label: "Design & Structure",
    href: `${BLOG_URL}/design-and-structure`,
    external: true,
  },
  {
    key: "materials-printing-and-finishes",
    label: "Materials & Finishes",
    href: `${BLOG_URL}/materials-printing-and-finishes`,
    external: true,
  },
  {
    key: "sustainability",
    label: "Sustainability",
    href: `${BLOG_URL}/sustainability`,
    external: true,
  },
  {
    key: "compliance-and-regulated",
    label: "Compliance",
    href: `${BLOG_URL}/compliance-and-regulated`,
    external: true,
  },
  {
    key: "cost-operations-sourcing",
    label: "Cost & Sourcing",
    href: `${BLOG_URL}/cost-operations-sourcing`,
    external: true,
  },
  {
    key: "branding-presentation",
    label: "Branding",
    href: `${BLOG_URL}/branding-presentation`,
    external: true,
  },
];

export const FOOTER_SOCIAL: SocialLink[] = [
  { platform: "instagram", url: "https://www.instagram.com/pakfactory" },
  { platform: "facebook", url: "https://www.facebook.com/pakfactory" },
  { platform: "linkedin", url: "https://www.linkedin.com/company/pakfactory" },
  { platform: "youtube", url: "https://www.youtube.com/@pakfactory" },
  { platform: "pinterest", url: "https://www.pinterest.com/pakfactory" },
];

const AI_PROMPT = encodeURIComponent(
  "What is PakFactory (pakfactory.com)? Summarize what they do, who they serve, and cite your sources.",
);

export const FOOTER_AI_LINKS: AiLink[] = [
  { engine: "chatgpt", url: `https://chatgpt.com/?q=${AI_PROMPT}` },
  { engine: "gemini", url: `https://gemini.google.com/app?q=${AI_PROMPT}` },
  {
    engine: "perplexity",
    url: `https://www.perplexity.ai/search?q=${AI_PROMPT}`,
  },
  { engine: "claude", url: `https://claude.ai/new?q=${AI_PROMPT}` },
  { engine: "grok", url: `https://grok.com/?q=${AI_PROMPT}` },
];

/** Footer "Let's talk" CTA button default — used when Studio's shared
 *  footerNavigation.builder has no ctaTextAndButton block. */
export const FOOTER_CTA: { label: string; href: string } = {
  label: "Let's talk packaging",
  href: WWW_ROUTES.contact,
};

/** POC/V5 www footer grid — Product · Customizations · Academy / … */
export function buildWwwV5FooterColumns(): FooterColumns {
  return [
    [
      {
        title: "Product",
        links: [
          { label: "Products", href: WWW_ROUTES.products },
          { label: "About", href: WWW_ROUTES.about },
          { label: "Contact", href: WWW_ROUTES.contact },
          {
            label: "Privacy Policy",
            href: policyHref("privacy-policy"),
          },
          {
            label: "Case Studies",
            href: WWW_ROUTES.caseStudies,
          },
        ],
      },
      {
        title: "Solutions",
        links: [
          { label: "Solutions", href: WWW_ROUTES.solutions },
          { label: "Contact", href: WWW_ROUTES.contact },
        ],
      },
      {
        title: "Expertise",
        links: [
          { label: "Expertise", href: WWW_ROUTES.expertise },
        ],
      },
    ],
    [
      {
        title: "Customizations",
        links: [
          {
            label: 'Customization',
            href: WWW_ROUTES.customizations,
          },
          { label: "Bundles", href: WWW_ROUTES.bundles },
          {
            label: "Request a Quote",
            href: WWW_ROUTES.requestExpress,
          },
        ],
      },
      {
        title: "Blog",
        links: [
          { label: "Blog", href: BLOG_URL, external: true },
          { label: "Contribute", href: `${BLOG_URL}/contribute`, external: true },
          { label: "Topics", href: `${BLOG_URL}/topics`, external: true },
        ],
      },
      {
        title: "Orders & Shipment",
        links: [
          { label: "Account", href: WWW_ROUTES.account },
          {
            label: "Account Requests",
            href: WWW_ROUTES.accountRequests,
          },
        ],
      },
    ],
    [
      {
        title: "Academy",
        links: [
          {
            label: "Packaging Type",
            href: `${BLOG_URL}/topics?group=packaging-type`,
            external: true,
          },
          {
            label: "Industry",
            href: `${BLOG_URL}/topics?group=industry`,
            external: true,
          },
          {
            label: "Sustainability",
            href: `${BLOG_URL}/sustainability`,
            external: true,
          },
        ],
      },
      {
        title: "Resources",
        links: [
          {
            label: "Case Studies",
            href: WWW_ROUTES.caseStudies,
          },
          { label: "Policies", href: WWW_ROUTES.policies },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Contact", href: WWW_ROUTES.contact },
          {
            label: "Help Center",
            href: WWW_ROUTES.contact,
          },
        ],
      },
    ],
  ];
}

export function buildFooterColumns(navItems: PrimaryNavItem[]): FooterColumns {
  const browseByCategories: FooterLink[] = navItems.map((item) => ({
    label: item.label,
    href: item.href,
    external: item.external ?? false,
  }));

  return [
    [
      {
        title: "Browse by Categories",
        links: browseByCategories,
      },
      {
        title: "Browse by Topics",
        links: [
          // Each group expands one axis on the blog /topics index via ?group=.
          { label: "Packaging Type", href: `${BLOG_URL}/topics?group=packaging-type`, external: true },
          { label: "Industry", href: `${BLOG_URL}/topics?group=industry`, external: true },
          { label: "Packaging Material", href: `${BLOG_URL}/topics?group=packaging-material`, external: true },
          { label: "Packaging Finish", href: `${BLOG_URL}/topics?group=packaging-finish`, external: true },
          { label: "Printing", href: `${BLOG_URL}/topics?group=printing`, external: true },
        ],
      },
    ],
    [
      {
        title: "Explore",
        links: [
          {
            label: "Contribute",
            href: `${BLOG_URL}/contribute`,
            external: true,
          },
          {
            label: "Product Inspiration",
            href: `${BLOG_URL}/topics`,
            external: true,
          },
          {
            label: "Customization",
            href: `${BLOG_URL}/topics`,
            external: true,
          },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About Us", href: `${WWW_URL}/about` },
          { label: "Contact Us", href: `${WWW_URL}/contact` },
          { label: "Case Studies", href: `${WWW_URL}/case-studies` },
          { label: "Hours & Locations", href: `${WWW_URL}/locations` },
          { label: "Careers", href: `${WWW_URL}/careers` },
          { label: "Help Center", href: `${WWW_URL}/help` },
        ],
      },
    ],
    [
      {
        title: "Custom packaging",
        links: [
          { label: "Products", href: `${WWW_URL}/products` },
          { label: "Industries", href: `${WWW_URL}/industries` },
          { label: "Services", href: `${WWW_URL}/solutions` },
          { label: "Why PakFactory", href: `${WWW_URL}/why-pakfactory` },
          { label: "Request a Quote", href: `${WWW_URL}/contact` },
        ],
      },
    ],
  ];
}

export const FOOTER_COLUMNS: FooterColumns = buildFooterColumns(
  BLOG_NAV_FALLBACK,
);
