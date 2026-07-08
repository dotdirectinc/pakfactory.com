import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Soft-launch robots.txt: only /case-studies is indexable.
 * Update to allow broader paths at full www launch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/case-studies",
      disallow: "/",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
