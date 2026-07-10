import type { NavCategory } from "@pakfactory/components/layout/site-nav";
import type { AiLink, FooterColumns, FooterLink, SocialLink } from "@pakfactory/components/layout/site-footer";
import { getSiteUrl } from "@/lib/site";

export const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://blog.pakfactory.com";
const WWW_URL = getSiteUrl();

export const BLOG_CATEGORIES: NavCategory[] = [
  { href: `${BLOG_URL}/packaging-news`, title: "Packaging News" },
  { href: `${BLOG_URL}/trends`, title: "Trends" },
  { href: `${BLOG_URL}/business-strategy`, title: "Business Strategy" },
  { href: `${BLOG_URL}/sustainability`, title: "Sustainability" },
  { href: `${BLOG_URL}/design-inspiration`, title: "Design Inspiration" },
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
  const browseLinks: FooterLink[] = [
    ...blogCategories.map((c) => ({ label: c.title, href: c.href, external: true })),
    { label: "All Topics", href: `${BLOG_URL}/topics`, external: true },
  ];

  return [
    [
      {
        title: "Browse the Blog",
        links: browseLinks,
      },
      {
        title: "Explore PakFactory",
        links: [
          { label: "About", href: `${WWW_URL}/about` },
          { label: "Case Studies", href: `${WWW_URL}/case-studies` },
          { label: "Resources", href: `${WWW_URL}/resources` },
          { label: "Get a Quote", href: `${WWW_URL}/contact` },
          { label: "Contribute to the Blog", href: `${BLOG_URL}/contribute`, external: true },
        ],
      },
    ],
    [
      {
        title: "Capabilities",
        links: [
          { label: "Rigid Boxes", href: `${WWW_URL}/capabilities` },
          { label: "Folding Cartons", href: `${WWW_URL}/capabilities` },
          { label: "Custom Pouches", href: `${WWW_URL}/capabilities` },
          { label: "Labels & Stickers", href: `${WWW_URL}/capabilities` },
          { label: "View All", href: `${WWW_URL}/capabilities` },
        ],
      },
    ],
    [
      {
        title: "Our Services",
        links: [
          { label: "Packaging Strategy", href: `${WWW_URL}/solutions` },
          { label: "Packaging Design", href: `${WWW_URL}/solutions` },
          { label: "Prototyping", href: `${WWW_URL}/solutions` },
          { label: "Managed Manufacturing", href: `${WWW_URL}/solutions` },
          { label: "Logistics", href: `${WWW_URL}/solutions` },
          { label: "Packaging Fulfillment", href: `${WWW_URL}/solutions` },
          { label: "View All", href: `${WWW_URL}/solutions` },
        ],
      },
    ],
  ];
}

export const FOOTER_COLUMNS: FooterColumns = buildFooterColumns(BLOG_CATEGORIES);
