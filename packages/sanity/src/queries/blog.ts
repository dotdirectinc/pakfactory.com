/**
 * Blog 3.0 GROQ — field names match `apps/studio/schemas` (post, blogCategory, author).
 * Popular posts: no `viewCount` on post yet; month window with publishedAt fallback in app code.
 *
 * All blog document queries accept `$language` (default `en` in apps/blog fetch helpers).
 */

export { DEFAULT_BLOG_LANGUAGE, BLOG_HOME_PAGE_IDS } from '../languages'

export const BLOG_CATEGORIES_QUERY = /* groq */ `*[_type == "blogCategory" && defined(slug.current) && language == $language] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

/**
 * Active CMS redirects (`apps/studio/schemas/redirect`). Applied at request time
 * on would-be-404s. `type` is "301" | "302"; the blog maps 301→308 / 302→307.
 */
export const BLOG_REDIRECTS_QUERY = /* groq */ `*[
  _type == "redirect" && isActive == true && defined(from) && defined(to)
]{
  "from": from,
  "to": to,
  "type": type
}`;

const POST_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage{
    ...,
    "alt": coalesce(alt, asset->altText),
    "caption": coalesce(caption, asset->description)
  },
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "authorName": author->name,
  "authorImageUrl": author->photo.asset->url,
  "readingTimeMinutes": round(length(pt::text(body)) / 5 / 238)
}`;

const POST_DETAIL_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  lastModified,
  canonical,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url,
  mainImage{
    ...,
    "alt": coalesce(alt, asset->altText),
    "caption": coalesce(caption, asset->description)
  },
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "readingTimeMinutes": round(length(pt::text(body)) / 5 / 238),
  "tags": tags[]->{
    _id,
    title,
    "slug": slug.current,
    tagGroup
  },
  "author": author->{
    name,
    "slug": slug.current,
    photo,
    role,
    tagline,
    shortBio
  },
  tldr,
  "tldrText": pt::text(tldr),
  body[]{
    ...,
    _type == "bodyImage" => {
      ...,
      alt,
      caption,
      link,
      linkNofollow,
      asset
    },
    _type == "widgetEmbed" => {
      _key,
      _type,
      "widget": widget->{
        widgetType,
        headline,
        subtext,
        buttonLabel,
        buttonUrl,
        variant,
        "productTitle": product->title,
        "productSlug": product->slug.current,
        "productExcerpt": product->excerpt
      }
    }
  },
  "faqItems": faqItems[]{
    question,
    answer,
    "answerText": pt::text(answer)
  },
  "relatedPosts": select(
    count(relatedPosts) > 0 => relatedPosts[]->${POST_CARD_FIELDS},
    *[
      _type == "post"
      && language == $language
      && category._ref == ^.category._ref
      && _id != ^._id
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
    ] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}
  )
}`;

/** Posts published in the current calendar month (UTC), newest first. */
export const POPULAR_POSTS_THIS_MONTH_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && publishedAt >= $monthStart
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** CMS-pinned hero post from the homepage page builder (`postFeaturedRow.featuredPost`). */
export const FEATURED_HOME_POST_QUERY = /* groq */ `*[
  (_type == "blogPage" && _id == $homePageId && language == $language)
  || (_type == "blogHomePage" && $language == "en")
][0].pageBuilder[_type == "postFeaturedRow"][0].featuredPost->${POST_CARD_FIELDS}`;

/** Latest posts for home hero sidebar (excludes featured id when provided). */
export const LATEST_HOME_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($excludeId == null || _id != $excludeId)
] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}`;

/** Shared page-builder block projection (home + landing arrays). */
const PAGE_BUILDER_BLOCKS_PROJECTION = /* groq */ `{
  _key,
  _type,
  _type == "postFeaturedRow" => {
    latestPostsCount,
    "featured": featuredPost->${POST_CARD_FIELDS},
    "latest": *[
      _type == "post"
  && language == $language
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
      && (^.featuredPost._ref == null || _id != ^.featuredPost._ref)
    ] | order(publishedAt desc)[0...8]${POST_CARD_FIELDS}
  },
  _type == "postCategoryRow" => {
    postsCount,
    "categorySlug": category->slug.current,
    "categoryTitle": category->title,
    "posts": *[
      _type == "post"
  && language == $language
      && category._ref == ^.category._ref
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
    ] | order(publishedAt desc)[0...6]${POST_CARD_FIELDS}
  },
  _type == "postSpotlightRow" => {
    heading,
    "posts": posts[]->${POST_CARD_FIELDS}
  },
  _type == "tagStrip" => {
    heading,
    "tags": tags[]->{ _id, title, "slug": slug.current }
  },
  _type == "ctaNewsletter" => {
    heading,
    body
  },
  _type == "ctaRfq" => {
    heading,
    body,
    ctaHref
  },
  _type == "ctaPillars" => {
    "pillars": pillars[]{ title, description, href, ctaLabel }
  },
  _type == "richTextBand" => {
    heading,
    body
  }
}`;

/**
 * Blog homepage page-builder (ADR-009). Returns the home singleton's section
 * array (`blogPage` with `pageRole == "home"`, id `blogHomePage`). Legacy
 * `blogHomePage` documents are still read until migrated.
 */
export const BLOG_HOME_PAGE_BUILDER_QUERY = /* groq */ `*[
  (_type == "blogPage" && _id == $homePageId && language == $language)
  || (_type == "blogHomePage" && $language == "en")
][0]{
  title,
  srHeading,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonical,
  "ogImageUrl": ogImage.asset->url,
  "pageBuilder": pageBuilder[]${PAGE_BUILDER_BLOCKS_PROJECTION}
}`;

/** Published landing/static page by slug (ADR-009). */
export const BLOG_PAGE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "blogPage"
  && language == $language
  && pageRole in ["landing", "static"]
  && slug.current == $slug
  && defined(publishedAt)
  && publishedAt <= now()
][0]{
  _id,
  title,
  pageRole,
  "slug": slug.current,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonical,
  "ogImageUrl": ogImage.asset->url,
  publishedAt,
  _updatedAt,
  "pageBuilder": pageBuilderLanding[]${PAGE_BUILDER_BLOCKS_PROJECTION}
}`;

/** Indexable CMS pages for sitemap (landing + static). */
export const BLOG_LANDING_PAGES_SITEMAP_QUERY = /* groq */ `*[
  _type == "blogPage"
  && language == $language
  && pageRole in ["landing", "static"]
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && allowIndex != false
]{
  "slug": slug.current,
  publishedAt,
  _updatedAt
}`;

/** Three newest posts in a category by blogCategory slug. */
export const POSTS_BY_CATEGORY_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Canonical post detail by slug (PROD-1502). */
export const POST_BY_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && slug.current == $slug
  && language == $language
  && defined(publishedAt)
  && publishedAt <= now()
][0]${POST_DETAIL_FIELDS}`;

/** Post detail under a category URL (legacy redirect route). */
export const POST_BY_CATEGORY_AND_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
  && slug.current == $postSlug
  && category->slug.current == $categorySlug
  && defined(publishedAt)
  && publishedAt <= now()
][0]${POST_DETAIL_FIELDS}`;

/** Category landing document (PROD-1499). */
export const BLOG_CATEGORY_BY_SLUG_QUERY = /* groq */ `*[_type == "blogCategory" && slug.current == $slug && (language == $language || !defined(language))][0]{
  _id,
  title,
  "slug": slug.current,
  description,
  "descriptionText": pt::text(description),
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url,
  "bannerImageUrl": bannerImage.asset->url
}`;

const CATEGORY_POST_FILTER = /* groq */ `_type == "post"
  && language == $language
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($excludeFeatured != true || featuredInCategory != true)
  && ($tagSlug == null || $tagSlug in tags[]->slug.current)
  && ($authorSlug == null || author->slug.current == $authorSlug)
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

/** Posts pinned for the category featured band (`featuredInCategory`, max 4). */
export const BLOG_CATEGORY_FEATURED_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && (language == $language || !defined(language))
  && category->slug.current == $categorySlug
  && featuredInCategory == true
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}`;

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
  && language == $language
  && _id in *[
    _type == "post"
  && language == $language
    && category->slug.current == $categorySlug
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(title asc){
  _id,
  title,
  "slug": slug.current,
  tagGroup
}`;

/** Authors with published posts in a category (sidebar facets). */
export const BLOG_CATEGORY_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
  && language == $language
    && category->slug.current == $categorySlug
    && defined(publishedAt)
    && publishedAt <= now()
  ].author._ref
] | order(name asc){
  _id,
  name,
  "slug": slug.current
}`;

/**
 * Keyword search (PROD-1503) — Sanity built-in `match`. `$searchTerm` is the
 * tokenized query (each token suffixed with `*` for prefix matching), built in
 * `apps/blog/src/lib/blog-search.ts`. Matches title, excerpt, body text, and
 * tag titles. `$yearStart`/`$yearEnd` narrow by publish date (nullable).
 */
const SEARCH_POST_FILTER = /* groq */ `_type == "post"
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && (
    title match $searchTerm
    || excerpt match $searchTerm
    || pt::text(body) match $searchTerm
    || count(tags[@->title match $searchTerm]) > 0
  )
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

export const BLOG_SEARCH_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${SEARCH_POST_FILTER}
])`;

/**
 * Relevance-ordered (default): field-weighted score on title/excerpt/body.
 * Tags stay in the filter for recall but are not boosted — `score()` rejects
 * dereferencing expressions like `tags[@->title match ...]`.
 */
export const BLOG_SEARCH_POSTS_PAGE_RELEVANCE_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | score(
    boost(title match $searchTerm, 5),
    boost(excerpt match $searchTerm, 2),
    pt::text(body) match $searchTerm
  ) | order(_score desc, publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_SEARCH_POSTS_PAGE_OLDEST_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(publishedAt asc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_SEARCH_POSTS_PAGE_TITLE_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(title asc)[$start...$end]${POST_CARD_FIELDS}`;

/** Industry pills for blog home (studio `industry` documents). */
export const INDUSTRIES_FOR_BLOG_HOME_QUERY = /* groq */ `*[
  _type == "industry"
  && defined(slug.current)
] | order(title asc)[0...10]{
  _id,
  title,
  "slug": slug.current
}`;

/** Industry-axis blog tags for the home "Browse by Industries" strip (link to /tag/{slug}). */
export const BLOG_INDUSTRY_TAGS_QUERY = /* groq */ `*[
  _type == "blogTag"
  && language == $language
  && tagGroup == "industry"
  && defined(slug.current)
] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

/** Total published posts (all archive pagination). */
export const BLOG_ALL_POSTS_COUNT_QUERY = /* groq */ `count(*[
  _type == "post"
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
])`;

/** Paginated all-posts archive (PROD-1498) — `$start` inclusive, `$end` exclusive. */
export const BLOG_ALL_POSTS_PAGE_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Latest 20 published posts for RSS 2.0 (`/rss.xml`, PROD-1505). */
export const BLOG_RSS_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
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
  && language == $language
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Published posts for the XML sitemap — slug, category for canonical path, and lastmod. */
export const BLOG_SITEMAP_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && language == $language
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
export const BLOG_TAG_BY_SLUG_QUERY = /* groq */ `*[_type == "blogTag" && slug.current == $slug && language == $language][0]{
  _id,
  title,
  "slug": slug.current,
  "descriptionText": description,
  tagGroup,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url
}`;

/** Global Settings singleton — default OG + org logo for metadata fallbacks. */
export const BLOG_GLOBAL_SETTINGS_QUERY = /* groq */ `*[_type == "settings"][0]{
  siteTitle,
  "defaultOgImageUrl": defaultOgImage.asset->url,
  "organizationLogoUrl": organization.logo.asset->url
}`;

/** Blog Settings singleton — per-type SEO format strings and sitemap defaults. */
export const BLOG_SETTINGS_QUERY = /* groq */ `*[_type == "blogSettings"][0]{
  postDefaults{
    metaTitleFormat,
    metaDescriptionFormat,
    allowIndex,
    allowFollow,
    noImageIndex,
    sitemapPriority,
    sitemapChangefreq
  },
  categoryDefaults{
    metaTitleFormat,
    metaDescriptionFormat,
    allowIndex,
    allowFollow,
    noImageIndex,
    sitemapPriority,
    sitemapChangefreq
  },
  tagDefaults{
    metaTitleFormat,
    metaDescriptionFormat,
    allowIndex,
    allowFollow,
    noImageIndex,
    sitemapPriority,
    sitemapChangefreq
  },
  authorDefaults{
    metaTitleFormat,
    metaDescriptionFormat,
    allowIndex,
    allowFollow,
    noImageIndex,
    sitemapPriority,
    sitemapChangefreq
  }
}`;

/** Category nav order from Blog Settings `categoryOrder` (editor drag-and-drop). */
export const BLOG_NAV_CATEGORIES_QUERY = /* groq */ `*[_id == "blogSettings"][0]{
  _id,
  "categories": categoryOrder[]->{
    _id,
    title,
    "slug": slug.current,
    language
  }
}`;

/** Published posts carrying $tagSlug, with optional author/date narrowing (tag is the page, not a filter). */
const TAG_POST_FILTER = /* groq */ `_type == "post"
  && language == $language
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
  && language == $language
  && slug.current != $tagSlug
  && _id in *[
    _type == "post"
  && language == $language
    && $tagSlug in tags[]->slug.current
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(title asc){
  _id,
  title,
  "slug": slug.current,
  tagGroup
}`;

/** Authors with published posts carrying $tagSlug (sidebar facet). */
export const BLOG_TAG_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
  && language == $language
    && $tagSlug in tags[]->slug.current
    && defined(publishedAt)
    && publishedAt <= now()
  ].author._ref
] | order(name asc){
  _id,
  name,
  "slug": slug.current
}`;

// ── Author profiles (PROD-1501) — /author/{slug} ────────────────────────────

/** Author profile by slug — bio portable text; socialLinks → Person sameAs. */
export const AUTHOR_BY_SLUG_QUERY = /* groq */ `*[_type == "author" && slug.current == $slug][0]{
  _id,
  name,
  "slug": slug.current,
  role,
  tagline,
  shortBio,
  authorType,
  bio,
  "bioText": pt::text(bio),
  socialLinks,
  photo,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url
}`;

const AUTHOR_POST_FILTER = /* groq */ `_type == "post"
  && language == $language
  && author->slug.current == $authorSlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()`;

export const AUTHOR_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${AUTHOR_POST_FILTER}
])`;

/** Paginated author posts (newest first) — `$start` inclusive, `$end` exclusive. */
export const AUTHOR_POSTS_PAGE_QUERY = /* groq */ `*[
  ${AUTHOR_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Authors with at least one published post (sitemap). */
export const AUTHORS_FOR_SITEMAP_QUERY = /* groq */ `*[
  _type == "author"
  && defined(slug.current)
  && count(*[_type == "post" && language == $language && author._ref == ^._id && defined(publishedAt) && publishedAt <= now()]) > 0
]{
  "slug": slug.current,
  _updatedAt
}`;
