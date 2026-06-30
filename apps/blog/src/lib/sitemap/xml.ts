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
};

function xslPI(xslHref: string): string {
  return `<?xml-stylesheet type="text/xsl" href="${xslHref}"?>\n`;
}

export function buildSitemapIndex(entries: SitemapIndexEntry[], xslHref?: string): string {
  const inner = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${e.loc}</loc>${lastmod}\n  </sitemap>`;
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
  const inner = entries
    .map((e) => {
      const lines = [`    <loc>${e.loc}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null) lines.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    (xslHref ? xslPI(xslHref) : "") +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
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
