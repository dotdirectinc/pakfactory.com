/**
 * Root llms.txt aggregation — one round-trip powering the dynamic
 * `pakfactory.com/llms.txt` generator in `apps/www/src/app/llms.txt/route.ts`
 * (served at the www app root, exposed publicly via nginx `location = /llms.txt`).
 *
 * Selection rules (successor to the retired `update-llms-txt*` scripts' --auto
 * mode — now applied live instead of via a curated snapshot field):
 *   • case studies — the 20 most recently modified (all, when ≤ 20 exist)
 *   • blog posts   — the 10 most recently modified published posts
 *   • categories   — all, A→Z
 *   • settings     — the two editorial knobs (manual override + storefront links)
 */

export const LLMS_INDEX_QUERY = /* groq */ `{
  "caseStudies": *[_type == "caseStudy" && defined(slug.current)]
    | order(_updatedAt desc)[0...20]{ title, "slug": slug.current },
  "caseStudyCount": count(*[_type == "caseStudy" && defined(slug.current)]),
  "posts": *[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()]
    | order(_updatedAt desc)[0...10]{ title, "slug": slug.current },
  "categories": *[_type == "blogCategory" && defined(slug.current)]
    | order(title asc){ title, "slug": slug.current },
  "settings": *[_id == "settings"][0]{ llmsTxtWww, llmsTxtStorefront }
}`;

export type LlmsIndexLink = {
  title?: string | null;
  slug?: string | null;
};

export type LlmsIndexData = {
  caseStudies?: LlmsIndexLink[] | null;
  caseStudyCount?: number | null;
  posts?: LlmsIndexLink[] | null;
  categories?: LlmsIndexLink[] | null;
  settings?: {
    llmsTxtWww?: string | null;
    llmsTxtStorefront?: string | null;
  } | null;
};
