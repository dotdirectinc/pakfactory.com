/**
 * Blog 3.0 GROQ — field names match `apps/studio/schemas` (post, blogCategory, author).
 * Popular posts: no `viewCount` on post yet; month window with publishedAt fallback in app code.
 */

export const BLOG_CATEGORIES_QUERY = /* groq */ `*[_type == "blogCategory" && defined(slug.current)] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

const POST_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage,
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "authorName": author->name
}`;

const POST_DETAIL_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  body,
  publishedAt,
  mainImage,
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "author": author->{name, "slug": slug.current, photo}
}`;

/** Posts published in the current calendar month (UTC), newest first. */
export const POPULAR_POSTS_THIS_MONTH_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && publishedAt >= $monthStart
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** CMS-pinned hero post (`featuredOnHome` on `apps/studio/schemas/post`). */
export const FEATURED_HOME_POST_QUERY = /* groq */ `*[
  _type == "post"
  && featuredOnHome == true
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0]${POST_CARD_FIELDS}`;

/** Latest posts for home hero sidebar (excludes featured id when provided). */
export const LATEST_HOME_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($excludeId == null || _id != $excludeId)
] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}`;

/** Three newest posts in a category by blogCategory slug. */
export const POSTS_BY_CATEGORY_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Post detail under a category URL (PROD-1499). */
export const POST_BY_CATEGORY_AND_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && slug.current == $postSlug
  && category->slug.current == $categorySlug
][0]${POST_DETAIL_FIELDS}`;

/** Category landing document (PROD-1499). */
export const BLOG_CATEGORY_BY_SLUG_QUERY = /* groq */ `*[_type == "blogCategory" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  "descriptionText": pt::text(description),
  metaTitle,
  metaDescription,
  "ogImageUrl": ogImage.asset->url
}`;

const CATEGORY_POST_FILTER = /* groq */ `_type == "post"
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($tagSlug == null || $tagSlug in tags[]->slug.current)
  && ($authorSlug == null || author->slug.current == $authorSlug)
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

export const BLOG_CATEGORY_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${CATEGORY_POST_FILTER}
])`;

export const BLOG_CATEGORY_POSTS_PAGE_NEWEST_QUERY = /* groq */ `*[
  ${CATEGORY_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_CATEGORY_POSTS_PAGE_OLDEST_QUERY = /* groq */ `*[
  ${CATEGORY_POST_FILTER}
] | order(publishedAt asc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_CATEGORY_POSTS_PAGE_TITLE_QUERY = /* groq */ `*[
  ${CATEGORY_POST_FILTER}
] | order(title asc)[$start...$end]${POST_CARD_FIELDS}`;

/** Tags used by published posts in a category (sidebar facets). */
export const BLOG_CATEGORY_TAGS_FACET_QUERY = /* groq */ `*[
  _type == "blogTag"
  && _id in *[
    _type == "post"
    && category->slug.current == $categorySlug
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(coalesce(order, 999) asc, title asc){
  _id,
  title,
  "slug": slug.current,
  tagGroup,
  order
}`;

/** Authors with published posts in a category (sidebar facets). */
export const BLOG_CATEGORY_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
    && category->slug.current == $categorySlug
    && defined(publishedAt)
    && publishedAt <= now()
  ].author._ref
] | order(name asc){
  _id,
  name,
  "slug": slug.current
}`;

/** Industry pills for blog home (studio `industry` documents). */
export const INDUSTRIES_FOR_BLOG_HOME_QUERY = /* groq */ `*[
  _type == "industry"
  && defined(slug.current)
] | order(coalesce(order, 999) asc)[0...10]{
  _id,
  title,
  "slug": slug.current
}`;

/** Industry-axis blog tags for the home "Browse by Industries" strip (link to /tag/{slug}). */
export const BLOG_INDUSTRY_TAGS_QUERY = /* groq */ `*[
  _type == "blogTag"
  && tagGroup == "industry"
  && defined(slug.current)
] | order(coalesce(order, 999) asc, title asc){
  _id,
  title,
  "slug": slug.current
}`;

/** Total published posts (all archive pagination). */
export const BLOG_ALL_POSTS_COUNT_QUERY = /* groq */ `count(*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
])`;

/** Paginated all-posts archive (PROD-1498) — `$start` inclusive, `$end` exclusive. */
export const BLOG_ALL_POSTS_PAGE_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Latest 20 published posts for RSS 2.0 (`/rss.xml`, PROD-1505). */
export const BLOG_RSS_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...20]{
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "authorName": author->name
}`;

/** Latest published posts when the month window returns fewer than three. */
export const POPULAR_POSTS_LATEST_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Published posts for the XML sitemap — slug, category for canonical path, and lastmod. */
export const BLOG_SITEMAP_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc){
  "slug": slug.current,
  "categorySlug": category->slug.current,
  publishedAt,
  _updatedAt
}`;

// ── Tag archives (PROD-1500) — /tag/{slug} ──────────────────────────────────

/** Tag landing document by slug. `description` is plain text (not portable text). */
export const BLOG_TAG_BY_SLUG_QUERY = /* groq */ `*[_type == "blogTag" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  "descriptionText": description,
  tagGroup,
  metaTitle,
  metaDescription,
  "ogImageUrl": ogImage.asset->url
}`;

/** Published posts carrying $tagSlug, with optional author/date narrowing (tag is the page, not a filter). */
const TAG_POST_FILTER = /* groq */ `_type == "post"
  && $tagSlug in tags[]->slug.current
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($authorSlug == null || author->slug.current == $authorSlug)
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

export const BLOG_TAG_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${TAG_POST_FILTER}
])`;

export const BLOG_TAG_POSTS_PAGE_NEWEST_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_TAG_POSTS_PAGE_OLDEST_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(publishedAt asc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_TAG_POSTS_PAGE_TITLE_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(title asc)[$start...$end]${POST_CARD_FIELDS}`;

/** Other tags co-occurring on posts that carry $tagSlug (excludes the tag itself) — grouped by axis in the sidebar. */
export const BLOG_TAG_COOCCURRING_TAGS_QUERY = /* groq */ `*[
  _type == "blogTag"
  && slug.current != $tagSlug
  && _id in *[
    _type == "post"
    && $tagSlug in tags[]->slug.current
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(coalesce(order, 999) asc, title asc){
  _id,
  title,
  "slug": slug.current,
  tagGroup,
  order
}`;

/** Authors with published posts carrying $tagSlug (sidebar facet). */
export const BLOG_TAG_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
    && $tagSlug in tags[]->slug.current
    && defined(publishedAt)
    && publishedAt <= now()
  ].author._ref
] | order(name asc){
  _id,
  name,
  "slug": slug.current
}`;
