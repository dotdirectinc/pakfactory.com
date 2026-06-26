export const revalidate = 31536000; // 1 year — stylesheet is static

const XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>PakFactory Blog — Sitemap</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f8f8; color: #111; }
          header { background: #111; color: #fff; padding: 18px 32px; display: flex; align-items: center; gap: 16px; }
          header h1 { font-size: 1rem; font-weight: 600; letter-spacing: -0.01em; }
          header p { font-size: 0.8125rem; color: #888; margin-top: 2px; }
          header a { color: #60a5fa; text-decoration: none; }
          header a:hover { text-decoration: underline; }
          main { max-width: 1080px; margin: 32px auto; padding: 0 24px 64px; }
          .meta { font-size: 0.8125rem; color: #666; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.07), 0 0 0 1px rgba(0,0,0,.06); }
          thead tr { background: #f3f4f6; }
          th { padding: 10px 16px; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; text-align: left; border-bottom: 1px solid #e5e7eb; }
          td { padding: 11px 16px; font-size: 0.875rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: #fafafa; }
          a { color: #2563eb; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .badge { display: inline-block; padding: 1px 7px; border-radius: 99px; background: #f3f4f6; border: 1px solid #e5e7eb; font-size: 0.75rem; color: #374151; }
          .dim { color: #9ca3af; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>PakFactory Blog — XML Sitemap</h1>
            <p>This sitemap is for search engines. <a href="/">Visit the blog</a> instead.</p>
          </div>
        </header>
        <main>
          <xsl:apply-templates/>
        </main>
      </body>
    </html>
  </xsl:template>

  <!-- Sitemap index -->
  <xsl:template match="sm:sitemapindex">
    <p class="meta"><xsl:value-of select="count(sm:sitemap)"/> sub-sitemaps</p>
    <table>
      <thead>
        <tr>
          <th>Sitemap</th>
          <th>Last Modified</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="sm:sitemap">
          <tr>
            <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
            <td>
              <xsl:choose>
                <xsl:when test="sm:lastmod"><xsl:value-of select="sm:lastmod"/></xsl:when>
                <xsl:otherwise><span class="dim">—</span></xsl:otherwise>
              </xsl:choose>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- URL set -->
  <xsl:template match="sm:urlset">
    <p class="meta"><xsl:value-of select="count(sm:url)"/> URLs</p>
    <table>
      <thead>
        <tr>
          <th>URL</th>
          <th>Last Modified</th>
          <th>Change Freq</th>
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="sm:url">
          <tr>
            <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
            <td>
              <xsl:choose>
                <xsl:when test="sm:lastmod"><xsl:value-of select="sm:lastmod"/></xsl:when>
                <xsl:otherwise><span class="dim">—</span></xsl:otherwise>
              </xsl:choose>
            </td>
            <td>
              <xsl:if test="sm:changefreq">
                <span class="badge"><xsl:value-of select="sm:changefreq"/></span>
              </xsl:if>
            </td>
            <td>
              <xsl:if test="sm:priority"><xsl:value-of select="sm:priority"/></xsl:if>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

</xsl:stylesheet>`;

export function GET() {
  return new Response(XSL, {
    status: 200,
    headers: {
      "Content-Type": "text/xsl; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
