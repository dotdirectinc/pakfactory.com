import type { FaviconAsset } from "@pakfactory/sanity/favicon";
import { BLOG_GLOBAL_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import {
  WWW_CONTENT_REVALIDATE_SECONDS,
  WWW_GLOBAL_SETTINGS_CACHE_TAG,
} from "@/lib/www-cache";
import { sanityCache, sanityReadFailed } from "@/lib/sanity/sanity-cache";

export type WwwGlobalSettings = {
  /** GTM container ID (e.g. GTM-XXXXXXX) from Global Settings → Integrations. */
  gtmId?: string | null;
  /** Global Settings → Integrations → Show Intercom chat. */
  intercomEnabled?: boolean | null;
  /** Global Settings → Integrations → Intercom App ID (public). */
  intercomAppId?: string | null;
  /**
   * Global Settings → Company → Organization → Company name (`organization.legalName`).
   * The shared query already returned it; this type simply never declared it, which is
   * why every www Organization node carried a literal instead (PROD-3230).
   */
  companyName?: string | null;
  /** Global Settings → Company → Company description. `Organization.description`. */
  companyDescription?: string | null;
  /** Global Settings → Company → Social profiles, blank URLs already dropped. */
  socialProfileUrls?: string[] | null;
  /** Company logo asset URL — `Organization.logo`. */
  organizationLogoUrl?: string | null;
  /** `Organization.foundingDate` — ISO date. */
  companyFoundingDate?: string | null;
  /** `Organization.email`. The press address is a separate field and stays separate. */
  companyEmail?: string | null;
  /** `Organization.telephone`. */
  companyPhone?: string | null;
  /** Global Settings → Company → Contact → Hours. Shown on the Contact page. */
  companyHours?: string | null;
  /** Structured address — the parts a `PostalAddress` node needs. */
  companyPostalAddress?: {
    streetAddress?: string | null;
    addressLocality?: string | null;
    addressRegion?: string | null;
    postalCode?: string | null;
    addressCountry?: string | null;
  } | null;
  /** Global OG image fallback for case studies and other www pages. */
  defaultOgImageUrl?: string | null;
  /** Editor-managed favicon (PROD-2200) — falls back to `public/favicon.ico`. */
  favicon?: FaviconAsset;
  /** Render-time image watermark (PROD-2206). */
  watermark?: {
    enabled?: boolean | null;
    lightImageUrl?: string | null;
    darkImageUrl?: string | null;
    opacity?: number | null;
  } | null;
};

async function loadWwwGlobalSettings(): Promise<WwwGlobalSettings | null> {
  if (!isSanityConfigured()) return null;
  try {
    return await getPublishedSanityClient().fetch<WwwGlobalSettings | null>(
      BLOG_GLOBAL_SETTINGS_QUERY,
    );
  } catch (err) {
    throw sanityReadFailed("[global-settings] Sanity loadWwwGlobalSettings failed:", err);
  }
}

const getCachedWwwGlobalSettings = sanityCache(
  loadWwwGlobalSettings,
  [WWW_GLOBAL_SETTINGS_CACHE_TAG],
  {
    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
    tags: [WWW_GLOBAL_SETTINGS_CACHE_TAG],
  },
);

/** Global Settings singleton — GTM container ID for production analytics inject. */
export async function fetchWwwGlobalSettings(): Promise<WwwGlobalSettings | null> {
  return getCachedWwwGlobalSettings();
}

/**
 * The editor-managed company name, or null when Global Settings cannot be read.
 * Callers fall back rather than inventing one — see `pakfactoryOrganization`.
 */
export async function fetchCompanyName(): Promise<string | null> {
  const settings = await fetchWwwGlobalSettings();
  return settings?.companyName?.trim() || null;
}

/** Everything the `Organization` JSON-LD node needs, from one cached read. */
export type CompanyRecord = {
  name: string;
  logoUrl?: string;
  description?: string;
  sameAs?: string[];
  foundingDate?: string;
  telephone?: string;
  email?: string;
  /** A schema.org `PostalAddress`, already shaped — omitted when every part is blank. */
  address?: Record<string, unknown>;
};

/**
 * The address parts as a `PostalAddress` node, or undefined when nothing is set.
 *
 * Built part by part rather than from the retired free-text field: a single
 * string cannot be split reliably, and `addressCountry` wants a two-letter ISO
 * code specifically (PROD-3231). Each part is omitted when blank, so a partly
 * filled address still produces a valid node instead of blank-valued keys.
 */
function postalAddress(
  parts: WwwGlobalSettings["companyPostalAddress"],
): Record<string, unknown> | undefined {
  if (!parts) return undefined;
  const node: Record<string, unknown> = {};
  const put = (key: string, value?: string | null): void => {
    const trimmed = value?.trim();
    if (trimmed) node[key] = trimmed;
  };
  put("streetAddress", parts.streetAddress);
  put("addressLocality", parts.addressLocality);
  put("addressRegion", parts.addressRegion);
  put("postalCode", parts.postalCode);
  put("addressCountry", parts.addressCountry);
  if (Object.keys(node).length === 0) return undefined;
  return { "@type": "PostalAddress", ...node };
}

/**
 * The company record for structured data, or **null when there is no company
 * name** — the same rule the newsroom's `publisherNode` follows. An Organization
 * with no name is not a weaker node, it is a false one, so nothing is invented.
 *
 * Every optional property is omitted rather than emitted blank, so a half-filled
 * Global Settings produces a smaller node and never an empty-valued one.
 */
export async function fetchCompanyRecord(): Promise<CompanyRecord | null> {
  const settings = await fetchWwwGlobalSettings();
  const name = settings?.companyName?.trim();
  if (!name) return null;
  const logoUrl = settings?.organizationLogoUrl?.trim();
  const description = settings?.companyDescription?.trim();
  const sameAs = (settings?.socialProfileUrls ?? [])
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url));
  const foundingDate = settings?.companyFoundingDate?.trim();
  const telephone = settings?.companyPhone?.trim();
  const email = settings?.companyEmail?.trim();
  const address = postalAddress(settings?.companyPostalAddress);
  return {
    name,
    ...(logoUrl ? { logoUrl } : {}),
    ...(description ? { description } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(foundingDate ? { foundingDate } : {}),
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
  };
}
