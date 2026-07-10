import type { NavCategory } from "@pakfactory/components/layout/site-nav";
import type { AiLink, FooterColumns, FooterLink, SocialLink } from "@pakfactory/components/layout/site-footer";
import { getWwwUrl } from "@/lib/site";

export const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://blog.pakfactory.com";
const WWW_URL = getWwwUrl();

export const BLOG_CATEGORIES: NavCategory[] = [
  { href: `${BLOG_URL}/design-and-structure`, title: "Design & Structure" },
  { href: `${BLOG_URL}/materials-and-finishes`, title: "Materials & Finishes" },
  { href: `${BLOG_URL}/sustainability`, title: "Sustainability" },
  { href: `${BLOG_URL}/compliance`, title: "Compliance" },
  { href: `${BLOG_URL}/cost-and-sourcing`, title: "Cost & Sourcing" },
  { href: `${BLOG_URL}/branding`, title: "Branding" },
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
  { engine: "perplexity", url: `https://www.perplexity.ai/search?q=${AI_PROMPT}` },
  { engine: "claude", url: `https://claude.ai/new?q=${AI_PROMPT}` },
  { engine: "grok", url: `https://grok.com/?q=${AI_PROMPT}` },
];

export function buildFooterColumns(blogCategories: NavCategory[]): FooterColumns {
  const browseByCategories: FooterLink[] = blogCategories.map((c) => ({
    label: c.title,
    href: c.href,
    external: true,
  }));

  return [
    // Column 1 — blog content discovery
    [
      {
        title: "Browse by Categories",
        links: browseByCategories,
      },
      {
        title: "Browse by Topics",
        links: [
          { label: "Packaging Type", href: `${WWW_URL}/topics/packaging-type` },
          { label: "Industry", href: `${WWW_URL}/topics/industry` },
          { label: "Packaging Material", href: `${WWW_URL}/topics/packaging-material` },
          { label: "Packaging Finish", href: `${WWW_URL}/topics/packaging-finish` },
          { label: "Printing", href: `${WWW_URL}/topics/printing` },
        ],
      },
    ],
    // Column 2 — blog + company links
    [
      {
        title: "Explore",
        links: [
          { label: "Contribute", href: `${BLOG_URL}/contribute`, external: true },
          { label: "Product Inspiration", href: `${BLOG_URL}/topics`, external: true },
          { label: "Customization", href: `${BLOG_URL}/topics`, external: true },
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
    // Column 3 — pakfactory.com sections
    [
      {
        title: "Custom packaging",
        links: [
          { label: "Products", href: `${WWW_URL}/capabilities` },
          { label: "Industries", href: `${WWW_URL}/industries` },
          { label: "Services", href: `${WWW_URL}/solutions` },
          { label: "Why PakFactory", href: `${WWW_URL}/why-pakfactory` },
          { label: "Request a Quote", href: `${WWW_URL}/contact` },
        ],
      },
    ],
  ];
}

export const FOOTER_COLUMNS: FooterColumns = buildFooterColumns(BLOG_CATEGORIES);
