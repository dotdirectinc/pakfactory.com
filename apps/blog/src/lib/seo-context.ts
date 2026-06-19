import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { fetchBlogSettings, type BlogTypeDefaults } from "@/lib/blog-settings";

export type SeoContext = {
  siteName: string;
  defaultOgImageUrl?: string | null;
  organizationLogoUrl?: string | null;
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
    blogSettings,
  };
}

export function typeDefaults(
  ctx: SeoContext,
  key: "postDefaults" | "categoryDefaults" | "tagDefaults" | "authorDefaults",
): BlogTypeDefaults | null | undefined {
  return ctx.blogSettings?.[key] ?? undefined;
}
