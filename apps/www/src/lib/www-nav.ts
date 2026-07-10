import type { NavCategory } from "@pakfactory/components/layout/site-nav";
import type { FooterColumns, SocialLink } from "@pakfactory/components/layout/site-footer";
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
];

export const FOOTER_COLUMNS: FooterColumns = [
  [
    {
      title: "Browse the Blog",
      links: [
        { label: "Packaging News", href: `${BLOG_URL}/packaging-news`, external: true },
        { label: "Trends", href: `${BLOG_URL}/trends`, external: true },
        { label: "Business Strategy", href: `${BLOG_URL}/business-strategy`, external: true },
        { label: "Sustainability", href: `${BLOG_URL}/sustainability`, external: true },
        { label: "Design Inspiration", href: `${BLOG_URL}/design-inspiration`, external: true },
        { label: "All Topics", href: `${BLOG_URL}/topics`, external: true },
      ],
    },
    {
      title: "Explore PakFactory",
      links: [
        { label: "About", href: `${WWW_URL}/about`, external: false },
        { label: "Case Studies", href: `${WWW_URL}/case-studies` },
        { label: "Resources", href: `${WWW_URL}/resources`, external: false },
        { label: "Get a Quote", href: `${WWW_URL}/contact`, external: false },
        { label: "Contribute to the Blog", href: `${BLOG_URL}/contribute`, external: true },
      ],
    },
  ],
  [
    {
      title: "Custom Packaging",
      links: [
        { label: "Rigid Boxes", href: `${WWW_URL}/capabilities`, external: false },
        { label: "Folding Cartons", href: `${WWW_URL}/capabilities`, external: false },
        { label: "Custom Pouches", href: `${WWW_URL}/capabilities`, external: false },
        { label: "Labels & Stickers", href: `${WWW_URL}/capabilities`, external: false },
        { label: "View All", href: `${WWW_URL}/capabilities`, external: false },
      ],
    },
  ],
  [
    {
      title: "Browse by Topics",
      links: [
        { label: "Explore Topics", href: `${BLOG_URL}/topics`, external: true },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About PakFactory", href: `${WWW_URL}/about`, external: false },
        { label: "Contact Us", href: `${WWW_URL}/contact`, external: false },
      ],
    },
  ],
];
