import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { fetchBlogSettings, type BlogTypeDefaults } from "@/lib/blog-settings";

export type SeoContext = {
  siteName: string;
  defaultOgImageUrl?: string | null;
  organizationLogoUrl?: string | null;
  /**
   * Global Settings → Company → Company name. Already queried and typed by
   * `BlogGlobalSettings`; it was simply never surfaced here, which is why the
   * Organization node carried a literal instead (PROD-3230).
   */
  companyName?: string | null;
  blogSettings: Awaited<ReturnType<typeof fetchBlogSettings>>;
};

/** Cached global + blog settings for metadata format resolution. */
export async function fetchSeoContext(): Promise<SeoContext> {
  const [global, blogSettings] = await Promise.all([
    fetchBlogGlobalSettings(),
    fetchBlogSettings(),
  ]);
  return {
    siteName: global?.siteTitle?.trim() || "PakFactory Blog",
    defaultOgImageUrl: global?.defaultOgImageUrl,
    organizationLogoUrl: global?.organizationLogoUrl,
    companyName: global?.companyName?.trim() || null,
    blogSettings,
  };
}

export function typeDefaults(
  ctx: SeoContext,
  key:
    | "postDefaults"
    | "categoryDefaults"
    | "tagDefaults"
    | "authorDefaults"
    | "pageDefaults",
): BlogTypeDefaults | null | undefined {
  return ctx.blogSettings?.[key] ?? undefined;
}
