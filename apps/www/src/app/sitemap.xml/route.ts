import {absoluteUrl} from '@/lib/site';
import {buildWwwSitemapGroups} from '@/lib/www-sitemap';
import {buildUrlset, type SitemapUrlEntry} from '@pakfactory/sitemap';

export const revalidate = 300;

// The local `buildSitemapXml` this replaced did **not** escape XML entities, so
// any `&`, `<` or quote in a slug or absolute URL emitted invalid XML that
// Search Console rejects (PROD-2179). `buildUrlset` escapes every value.
//
// Response headers are deliberately kept as-is rather than switching to the
// package's `xmlResponse`: this route uses `stale-while-revalidate=600`, which
// that helper does not emit. Escaping is the only intended behaviour change.
//
// PROD-3235 expands coverage beyond case studies / newsroom to the full
// marketing catalog + company pages. Category landings stay out (PROD-2848).

export async function GET() {
  const groups = await buildWwwSitemapGroups();
  const urls: SitemapUrlEntry[] = groups.flatMap((group) =>
    group.links.map((link) => ({
      loc: absoluteUrl(link.href),
      ...(link.lastmod ? {lastmod: link.lastmod} : {}),
    })),
  );

  return new Response(buildUrlset(urls), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
