/** Shared XML builders for the grouped sitemap implementation (PROD-1865). */

export const SITEMAP_GROUP_SIZE = 200;

export type SitemapIndexEntry = {
  loc: string;
  lastmod?: string;
};

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  /**
   * Absolute image URLs for the Google image sitemap extension. When any entry
   * carries images, `buildUrlset` declares the image namespace and emits an
   * `<image:image><image:loc>…</image:loc></image:image>` block per URL.
   */
  images?: string[];
};

/** Google image sitemap namespace (only `<image:loc>` is still supported). */
const IMAGE_SITEMAP_NS = "http://www.google.com/schemas/sitemap-image/1.1";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xslPI(xslHref: string): string {
  return `<?xml-stylesheet type="text/xsl" href="${xslHref}"?>\n`;
}

export function buildSitemapIndex(entries: SitemapIndexEntry[], xslHref?: string): string {
  const inner = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${escapeXml(e.loc)}</loc>${lastmod}\n  </sitemap>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    (xslHref ? xslPI(xslHref) : "") +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${inner}\n` +
    `</sitemapindex>`
  );
}

export function buildUrlset(entries: SitemapUrlEntry[], xslHref?: string): string {
  const hasImages = entries.some((e) => e.images && e.images.length > 0);
  const inner = entries
    .map((e) => {
      const lines = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null) lines.push(`    <priority>${e.priority}</priority>`);
      for (const image of e.images ?? []) {
        lines.push(
          `    <image:image>\n      <image:loc>${escapeXml(image)}</image:loc>\n    </image:image>`,
        );
      }
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");
  const imageNs = hasImages ? `\n        xmlns:image="${IMAGE_SITEMAP_NS}"` : "";
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    (xslHref ? xslPI(xslHref) : "") +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>\n` +
    `${inner}\n` +
    `</urlset>`
  );
}

export function xmlResponse(xml: string, revalidateSeconds: number): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidateSeconds}, stale-while-revalidate`,
    },
  });
}
