/**
 * Blog 3.0 GROQ — field names match `apps/studio/schemas` (post, blogCategory, author).
 * Popular posts: ranked by `viewCount` desc within a time window (block `timeWindowDays`
 * or monthStart for search/backfill); `publishedAt` as tiebreak; latest-posts fallback in app code.
 *
 * All blog document queries accept `$language` (default `en` in apps/blog fetch helpers).
 */

export { DEFAULT_BLOG_LANGUAGE, BLOG_HOME_PAGE_IDS, BLOG_TOPICS_PAGE_IDS } from '../languages'

/**
 * Read-time utility — single source of truth for the estimated reading time.
 *
 * Computed entirely in GROQ so the post `body` never has to cross the wire just
 * to be word-counted (important on card/listing queries): `pt::text(body)`
 * flattens the Portable Text to a string server-side, `length(...) / 5`
 * approximates the word count (~5 chars/word incl. spaces), divided by the
 * average reading speed. Reuse `READING_TIME_MINUTES_PROJECTION` in every post
 * projection instead of re-writing the formula.
 */
export const READING_TIME_WPM = 238;

export const READING_TIME_MINUTES_PROJECTION = /* groq */ `"readingTimeMinutes": round(length(pt::text(body)) / 5 / ${READING_TIME_WPM})`;

export const BLOG_CATEGORIES_QUERY = /* groq */ `*[_type == "blogCategory" && defined(slug.current) && (language == $language || !defined(language))] | order(title asc){
  _id,
  title,
  navLabel,
  "slug": slug.current
}`;

/** 404 page singleton (blogPage id "blogNotFoundPage") — curated recovery topics. */
export const BLOG_NOT_FOUND_PAGE_QUERY = /* groq */ `*[_type == "blogPage" && _id == "blogNotFoundPage"][0]{
  "topics": recommendedTopics[]->{
    _id,
    title,
    "slug": slug.current
  }
}`;

/** Fallback topics when no 404 topics are curated — newest/alphabetical topics with a slug. */
export const BLOG_NOT_FOUND_TOPICS_FALLBACK_QUERY = /* groq */ `*[
  _type == "blogTag" && defined(slug.current) && (language == $language || !defined(language))
] | order(title asc)[0...6]{
  _id,
  title,
  "slug": slug.current
}`;

/**
 * Active CMS redirects (`apps/studio/schemas/redirect`). Applied at request time
 * on would-be-404s. Status comes from `behaviour` (permanent 301 / temporary 302 /
 * gone 410); the RSC fallback maps 301→308 / 302→307.
 */
export const BLOG_REDIRECTS_QUERY = /* groq */ `*[
  _type == "redirect" && isActive == true && defined(from) && (defined(to) || behaviour == "gone")
]{
  "from": from,
  "to": to,
  "matchType": matchType,
  "behaviour": behaviour,
  "priority": priority,
  "appendMatchedTail": appendMatchedTail
}`;

/**
 * A post's author reference, falling back to the global default author
 * (`authorSettings.defaultAuthor`) when the post has none assigned. `coalesce`
 * short-circuits, so the fallback lookup only runs for authorless posts.
 */
const AUTHOR_REF = /* groq */ `coalesce(author, *[_id == "authorSettings"][0].defaultAuthor)`;

const POST_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage{
    ...,
    "alt": coalesce(alt, asset->altText)
  },
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "authorName": ${AUTHOR_REF}->name,
  "authorSlug": ${AUTHOR_REF}->slug.current,
  "authorImageUrl": ${AUTHOR_REF}->photo.asset->url,
  ${READING_TIME_MINUTES_PROJECTION}
}`;

const VIDEO_POST_FIELDS = /* groq */ `{
  _id,
  title,
  description,
  publishedAt,
  sourceType,
  platform,
  externalUrl,
  duration,
  "videoFileUrl": videoFile.asset->url,
  thumbnail {
    ...,
    "alt": coalesce(alt, asset->altText)
  }
}`;

const TOPIC_GROUP_PROJECTION = /* groq */ `{
  title,
  "slug": slug.current
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
    "alt": coalesce(alt, asset->altText)
  },
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  ${READING_TIME_MINUTES_PROJECTION},
  "tags": tags[]->{
    _id,
    title,
    "slug": slug.current,
    "topicGroup": topicGroup->${TOPIC_GROUP_PROJECTION}
  },
  "author": ${AUTHOR_REF}->{
    name,
    "slug": slug.current,
    photo,
    role,
    experience,
    shortBio,
    authorType,
    "bioText": pt::text(bio),
    socialLinks[]{
      platform,
      url,
      label
    }
  },
  tldr,
  "tldrText": pt::text(tldr),
  body[]{
    ...,
    _type == "bodyImage" => {
      ...,
      "alt": coalesce(alt, asset.asset->altText),
      caption,
      link,
      linkNofollow,
      asset
    },
    _type == "bodyQuote" => {
      _key,
      _type,
      quote,
      attribution
    },
    _type == "bodyGallery" => {
      _key,
      _type,
      caption,
      aspectRatio,
      images[]{
        _key,
        "alt": coalesce(alt, asset.asset->altText),
        asset
      }
    },
    _type == "bodyTable" => {
      _key,
      _type,
      variant,
      columns,
      caption,
      rows[]{
        _key,
        cells
      }
    },
    _type == "bodyEmbed" => {
      _key,
      _type,
      url,
      title,
      sizing,
      height,
      width,
      caption
    },
    _type == "bodyVideo" => {
      _key,
      _type,
      url,
      title,
      caption,
      poster
    },
    _type == "bodyStatStack" => {
      _key,
      _type,
      source,
      stats[]{
        _key,
        value,
        label
      }
    },
    _type == "bodyBarChart" => {
      _key,
      _type,
      title,
      xAxisLabel,
      yAxisLabel,
      source,
      data[]{
        _key,
        label,
        value,
        highlight
      }
    },
    _type == "bodyCallout" => {
      _key,
      _type,
      calloutTone,
      calloutTitle,
      calloutBody[]{
        ...,
        markDefs[]{
          ...,
          _type == "link" => {
            ...,
            href
          }
        }
      }
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
      && (!defined(language) || language == $language)
      && category._ref == ^.category._ref
      && _id != ^._id
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
    ] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}
  )
}`;

/** Posts published in the current calendar month (UTC), ranked by Views then newest. */
export const POPULAR_POSTS_THIS_MONTH_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && publishedAt >= $monthStart
] | order(coalesce(viewCount, 0) desc, publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** First hero slide from the homepage page builder (`postFeaturedRow.featuredPosts[0]`). */
export const FEATURED_HOME_POST_QUERY = /* groq */ `*[
  (_type == "blogPage" && _id == $homePageId && (language == $language || !defined(language)))
  || (_type == "blogHomePage" && $language == "en")
][0].pageBuilder[_type == "postFeaturedRow"][0].featuredPosts[0]->${POST_CARD_FIELDS}`;

/** Latest posts for home hero sidebar (excludes featured id when provided). */
export const LATEST_HOME_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($excludeId == null || _id != $excludeId)
] | order(publishedAt desc)[0...4]${POST_CARD_FIELDS}`;

/** Shared page-builder block projection (home + landing arrays). */
const PAGE_BUILDER_BLOCKS_PROJECTION = /* groq */ `{
  _key,
  _type,
  showTopBorder,
  showBottomBorder,
  _type == "postFeaturedRow" => {
    "slides": featuredPosts[]->${POST_CARD_FIELDS},
    "fallbackLatest": *[
      _type == "post"
  && (!defined(language) || language == $language)
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
    ] | order(coalesce(featuredInCategory, false) desc, publishedAt desc)[0...4]${POST_CARD_FIELDS}
  },
  _type == "postCategoryRow" => {
    postsCount,
    "categorySlug": category->slug.current,
    "categoryTitle": category->title,
    "categoryDescription": pt::text(category->description),
    "posts": *[
      _type == "post"
  && (!defined(language) || language == $language)
      && category._ref == ^.category._ref
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
    ] | order(publishedAt desc)[0...6]${POST_CARD_FIELDS}
  },
  _type == "postPopularRow" => {
    heading,
    postsCount,
    timeWindowDays,
    "posts": *[
      _type == "post"
      && (!defined(language) || language == $language)
      && defined(slug.current)
      && defined(publishedAt)
      && publishedAt <= now()
      && dateTime(publishedAt) >= dateTime(now()) - (coalesce(^.timeWindowDays, 30) * 86400)
    ] | order(coalesce(viewCount, 0) desc, publishedAt desc)[0...6]${POST_CARD_FIELDS}
  },
  _type == "postSpotlightRow" => {
    heading,
    "posts": posts[]->${POST_CARD_FIELDS}
  },
  _type == "topicStrip" || _type == "tagStrip" => {
    heading,
    "topics": select(
      count(coalesce(topics, tags)) > 0 => coalesce(topics, tags)[]->{ _id, title, "slug": slug.current },
      *[
        _type == "blogTag"
        && (language == $language || !defined(language))
        && defined(slug.current)
        && count(*[
          _type == "post"
          && (!defined(language) || language == $language)
          && defined(publishedAt)
          && publishedAt <= now()
          && ^._id in tags[]._ref
        ]) > 0
      ] | order(title asc){ _id, title, "slug": slug.current }
    )
  },
  _type == "featuredVideos" => {
    heading,
    channelCtaLabel,
    channelCtaUrl,
    playbackMode,
    "featuredVideo": featuredVideo->${VIDEO_POST_FIELDS},
    "videos": videos[]->${VIDEO_POST_FIELDS}
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
  _type == "ctaSpotlight" => {
    heading,
    body,
    ctaLabel,
    linkType,
    externalUrl,
    "internalLink": internalLink->{
      _id,
      _type,
      title,
      "slug": slug.current,
      "name": name,
      "term": term,
      pageRole,
      pageType,
      category,
      "handle": handle.current,
      "collectionSlug": primaryCollection->slug.current,
      "pageSlug": primaryLandingPage->slug.current
    },
    imageEffect,
    "backgroundColor": coalesce(backgroundColor.hex, customBackgroundColor.hex),
    image{ ..., "alt": coalesce(alt, asset->altText) },
    topBorderWidth,
    bottomBorderWidth
  },
  _type == "richTextBand" => {
    heading,
    body
  }
}`;

/**
 * 404 page singleton with page-builder blocks (blogPage id "blogNotFoundPage").
 * Requires `$language` and `$monthStart` params (see blogNotFoundPageParams).
 */
export const BLOG_NOT_FOUND_PAGE_BUILDER_QUERY = /* groq */ `*[_type == "blogPage" && _id == "blogNotFoundPage"][0]{
  title,
  description,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonical,
  "ogImageUrl": ogImage.asset->url,
  "topics": recommendedTopics[]->{
    _id,
    title,
    "slug": slug.current
  },
  "pageBuilder": pageBuilder[]${PAGE_BUILDER_BLOCKS_PROJECTION}
}`;

/**
 * Search page singleton with page-builder blocks (blogPage id "blogSearchPage").
 * Content source for the reserved `/search` route — not slug-routable.
 * Requires `$language` and `$monthStart` params (see blogSearchPageParams).
 */
export const BLOG_SEARCH_PAGE_BUILDER_QUERY = /* groq */ `*[_type == "blogPage" && _id == "blogSearchPage"][0]{
  title,
  description,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonical,
  "ogImageUrl": ogImage.asset->url,
  "topics": recommendedTopics[]->{
    _id,
    title,
    "slug": slug.current
  },
  "pageBuilder": pageBuilder[]${PAGE_BUILDER_BLOCKS_PROJECTION}
}`;

/**
 * Contribute page singleton — SEO + page blocks for the reserved `/contribute`
 * code route (form stays in the app).
 */
export const BLOG_CONTRIBUTE_PAGE_BUILDER_QUERY = /* groq */ `*[
  _type == "blogPage" && _id == $contributePageId && (language == $language || !defined(language))
][0]{
  title,
  description,
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

/** Populated topic group row for /topics grid (shared by index + page Overview queries). */
const BLOG_TOPIC_GROUP_ROW_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  order,
  "topics": *[
    _type == "blogTag"
    && topicGroup._ref == ^._id
    && (!defined(language) || language == $language)
    && defined(slug.current)
  ] | order(title asc) {
    _id,
    title,
    "slug": slug.current
  }
`;

const BLOG_TOPICS_PAGE_TOPICS_PROJECTION = /* groq */ `"topics": topics[]->{
  ${BLOG_TOPIC_GROUP_ROW_FIELDS}
}`;

/**
 * Blog homepage page-builder (ADR-009). Returns the home singleton's block
 * array (`blogPage` with `pageRole == "home"`, id `blogHomePage`). Legacy
 * `blogHomePage` documents are still read until migrated.
 */
export const BLOG_HOME_PAGE_BUILDER_QUERY = /* groq */ `*[
  (_type == "blogPage" && _id == $homePageId && (language == $language || !defined(language)))
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

/**
 * Topics index page-builder (ADR-009). Returns the topics singleton's block
 * array (`blogPage` with `pageRole == "topics"`, id `blogTopicsPage`).
 */
export const BLOG_TOPICS_PAGE_BUILDER_QUERY = /* groq */ `*[
  _type == "blogPage" && _id == $topicsPageId && (language == $language || !defined(language))
][0]{
  title,
  description,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  canonical,
  "ogImageUrl": ogImage.asset->url,
  "pageBuilder": pageBuilder[]${PAGE_BUILDER_BLOCKS_PROJECTION},
  ${BLOG_TOPICS_PAGE_TOPICS_PROJECTION}
}`;

/** Published landing/static page by slug (ADR-009). */
export const BLOG_PAGE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "blogPage"
  && (language == $language || !defined(language))
  && pageRole in ["landing", "static"]
  && slug.current == $slug
  && defined(publishedAt)
  && publishedAt <= now()
][0]{
  _id,
  title,
  pageRole,
  "slug": slug.current,
  description,
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
  && (!defined(language) || language == $language)
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
  && (!defined(language) || language == $language)
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Canonical post detail by slug (PROD-1502). */
export const POST_BY_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && slug.current == $slug
  && (!defined(language) || language == $language)
  && defined(publishedAt)
  && publishedAt <= now()
][0]${POST_DETAIL_FIELDS}`;

/** Post detail under a category URL (legacy redirect route). */
export const POST_BY_CATEGORY_AND_SLUG_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
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
  && (!defined(language) || language == $language)
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

/**
 * Recommended topics for the category page (PROD-1951): the tag list of the
 * most-recently-modified published post in the category. Ordered by
 * coalesce(lastModified, _updatedAt) desc so it tracks the freshest editorial
 * signal; returns that post's tags (id, title, slug) or null when none.
 */
export const BLOG_CATEGORY_RECOMMENDED_TOPICS_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && category->slug.current == $categorySlug
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(coalesce(lastModified, _updatedAt) desc)[0].tags[]->{
  _id,
  title,
  "slug": slug.current
}`;

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
  && (language == $language || !defined(language))
  && _id in *[
    _type == "post"
  && (!defined(language) || language == $language)
    && category->slug.current == $categorySlug
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(title asc){
  _id,
  title,
  "slug": slug.current,
  "topicGroup": topicGroup->${TOPIC_GROUP_PROJECTION}
}`;

/** Authors with published posts in a category (sidebar facets). */
export const BLOG_CATEGORY_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
  && (!defined(language) || language == $language)
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
 * Keyword search (PROD-1503, PROD-1950) — Sanity built-in `match`. `$searchTerm`
 * is the tokenized query (each token suffixed with `*` for prefix matching), built
 * in `apps/blog/src/lib/blog-search.ts`. Matches title, category title, excerpt,
 * body text, and tag titles (all case-insensitive). `$categorySlugs` is a nullable
 * array that narrows to the selected categories (empty = all).
 * `$yearStart`/`$yearEnd` narrow by publish date (nullable).
 */
const SEARCH_POST_FILTER = /* groq */ `_type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && (
    title match $searchTerm
    || category->title match $searchTerm
    || excerpt match $searchTerm
    || pt::text(body) match $searchTerm
    || count(tags[@->title match $searchTerm]) > 0
  )
  && (count($categorySlugs) == 0 || category->slug.current in $categorySlugs)
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

export const BLOG_SEARCH_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${SEARCH_POST_FILTER}
])`;

/** Newest (date posted) — default search sort. */
export const BLOG_SEARCH_POSTS_PAGE_NEWEST_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Recently updated — editorial lastModified, falling back to Sanity _updatedAt. */
export const BLOG_SEARCH_POSTS_PAGE_UPDATED_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(coalesce(lastModified, _updatedAt) desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Most popular — viewCount desc, then publishedAt as tiebreaker. */
export const BLOG_SEARCH_POSTS_PAGE_POPULAR_QUERY = /* groq */ `*[
  ${SEARCH_POST_FILTER}
] | order(coalesce(viewCount, 0) desc, publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Industry pills for blog home (studio `industry` documents). */
export const INDUSTRIES_FOR_BLOG_HOME_QUERY = /* groq */ `*[
  _type == "industry"
  && defined(slug.current)
] | order(title asc)[0...10]{
  _id,
  title,
  "slug": slug.current
}`;

/** Industry-axis blog tags for the home "Browse by Industries" strip (link to /topics/{slug}). */
export const BLOG_INDUSTRY_TAGS_QUERY = /* groq */ `*[
  _type == "blogTag"
  && (language == $language || !defined(language))
  && topicGroup->slug.current == "industry"
  && defined(slug.current)
] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

/** Total published posts (all archive pagination). */
export const BLOG_ALL_POSTS_COUNT_QUERY = /* groq */ `count(*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
])`;

/** Paginated all-posts archive (PROD-1498) — `$start` inclusive, `$end` exclusive. */
export const BLOG_ALL_POSTS_PAGE_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/**
 * All-posts archive in a single round-trip — total count + one page slice.
 * Collapses the former count + page queries into one request (PROD-2008 perf).
 * `$start` inclusive, `$end` exclusive.
 */
export const BLOG_ALL_POSTS_ARCHIVE_QUERY = /* groq */ `{
  "totalCount": count(*[
    _type == "post"
    && (!defined(language) || language == $language)
    && defined(slug.current)
    && defined(publishedAt)
    && publishedAt <= now()
  ]),
  "posts": *[
    _type == "post"
    && (!defined(language) || language == $language)
    && defined(slug.current)
    && defined(publishedAt)
    && publishedAt <= now()
  ] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}
}`;

/** Latest 20 published posts for RSS 2.0 (`/rss.xml`, PROD-1505). */
export const BLOG_RSS_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
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
  "authorName": ${AUTHOR_REF}->name
}`;

/** Published posts ranked by Views when the month window returns fewer than three. */
export const POPULAR_POSTS_LATEST_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(coalesce(viewCount, 0) desc, publishedAt desc)[0...3]${POST_CARD_FIELDS}`;

/** Published posts for the XML sitemap — slug, category for canonical path, and lastmod. */
export const BLOG_SITEMAP_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc){
  "slug": slug.current,
  "categorySlug": category->slug.current,
  publishedAt,
  _updatedAt
}`;

// ── Topic archives (PROD-1500) — /topics/{slug} ───────────────────────────────

/** Tag landing document by slug. `description` is plain text (not portable text). */
export const BLOG_TAG_BY_SLUG_QUERY = /* groq */ `*[_type == "blogTag" && slug.current == $slug && (language == $language || !defined(language))][0]{
  _id,
  title,
  "slug": slug.current,
  "descriptionText": description,
  "topicGroup": topicGroup->${TOPIC_GROUP_PROJECTION},
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  allowIndex,
  allowFollow,
  noImageIndex,
  "ogImageUrl": ogImage.asset->url
}`;

/** Global Settings singleton — default OG + org logo for metadata fallbacks + crawler text files. */
export const BLOG_GLOBAL_SETTINGS_QUERY = /* groq */ `*[_type == "settings"][0]{
  siteTitle,
  "defaultOgImageUrl": defaultOgImage.asset->url,
  "organizationLogoUrl": organization.logo.asset->url,
  "companyLogo": organization.logo{
    "url": asset->url,
    "alt": coalesce(alt, asset->altText),
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  "companyName": organization.legalName,
  "companyAddress": organization.contact.address,
  additionalEmbedHosts,
  gtmId,
  indexNowKey
}`;

/**
 * Per-type SEO format strings + sitemap defaults, each from its co-located
 * `*Settings` singleton (PROD-2116). The legacy `blogSettings.*Defaults` fallback
 * was removed after the singletons were seeded + verified in prod. Return shape is
 * unchanged (`topicSettings` maps to the `tagDefaults` key — the type is `blogTag`);
 * an unseeded dataset yields null objects, which the resolve layer already handles.
 */
export const BLOG_SETTINGS_QUERY = /* groq */ `{
  "postDefaults": *[_id == "postSettings"][0]{
    metaTitleFormat, metaDescriptionFormat, allowIndex, allowFollow, noImageIndex
  },
  "categoryDefaults": *[_id == "categorySettings"][0]{
    metaTitleFormat, metaDescriptionFormat, allowIndex, allowFollow, noImageIndex
  },
  "tagDefaults": *[_id == "topicSettings"][0]{
    metaTitleFormat, metaDescriptionFormat, allowIndex, allowFollow, noImageIndex, autoNoindexThreshold
  },
  "authorDefaults": *[_id == "authorSettings"][0]{
    metaTitleFormat, metaDescriptionFormat, allowIndex, allowFollow, noImageIndex
  },
  "pageDefaults": *[_id == "pageSettings"][0]{
    metaTitleFormat, metaDescriptionFormat, allowIndex, allowFollow, noImageIndex
  }
}`;

/** Primary nav items (categories + custom links) + header CTA from Blog Navigation `primaryNavigation`. */
export const BLOG_NAV_CATEGORIES_QUERY = /* groq */ `*[_id == "blogNavigation"][0]{
    _id,
    "categories": primaryNavigation.categories[]{
      _type,
      _key,
      "category": select(defined(_ref) => @->{
        _id,
        title,
        navLabel,
        "slug": slug.current,
        language
      }),
      label,
      linkType,
      externalUrl,
      "internalLink": internalLink->{
        _id,
        _type,
        title,
        "slug": slug.current,
        "name": name,
        "term": term,
        pageRole,
        pageType,
        category,
        "handle": handle.current,
        "collectionSlug": primaryCollection->slug.current,
        "pageSlug": primaryLandingPage->slug.current
      }
    },
    "header": {
      "cta": primaryNavigation.cta{
        label,
        linkType,
        externalUrl,
        "internalLink": internalLink->{
          _id,
          _type,
          title,
          "slug": slug.current,
          "name": name,
          "term": term,
          pageRole,
          pageType,
          category,
          "handle": handle.current,
          "collectionSlug": primaryCollection->slug.current,
          "pageSlug": primaryLandingPage->slug.current
        }
      }
    }
  }
`;

/** Footer blocks, link columns, social links, and AI answer links from Blog Navigation `footerNavigation`. */
export const BLOG_FOOTER_NAV_QUERY = /* groq */ `*[_id == "blogNavigation"][0]{
  _id,
  "builder": footerNavigation.builder[]{
    _key,
    _type,
    message,
    buttonLabel,
    align,
    showTopBorder,
    showBottomBorder,
    linkType,
    externalUrl,
    // Legacy site-path fields — soft-resolved until editors re-point to CMS docs
    internalKind,
    sitePath,
    "internalLink": internalLink->{
      _id,
      _type,
      title,
      "slug": slug.current,
      "name": name,
      "term": term,
      pageRole,
      pageType,
      category,
      "handle": handle.current,
      "collectionSlug": primaryCollection->slug.current,
      "pageSlug": primaryLandingPage->slug.current
    }
  },
  "columns": footerNavigation.columns[]{
    "sections": sections[]{
      title,
      "links": links[]{
        label,
        linkType,
        externalUrl,
        // Legacy site-path fields — soft-resolved until editors re-point to CMS docs
        internalKind,
        sitePath,
        href,
        external,
        "internalLink": internalLink->{
          _id,
          _type,
          title,
          "slug": slug.current,
          "name": name,
          "term": term,
          pageRole,
          pageType,
          category,
          "handle": handle.current,
          "collectionSlug": primaryCollection->slug.current,
          "pageSlug": primaryLandingPage->slug.current
        }
      }
    }
  },
  "social": footerNavigation.socialLinks[]{
    platform,
    url
  },
  "aiLinks": footerNavigation.aiAnswerLinks[]{
    engine,
    url
  }
}`;

/** Published posts carrying $tagSlug, with optional author/date/category narrowing (tag is the page, not a filter). */
const TAG_POST_FILTER = /* groq */ `_type == "post"
  && (!defined(language) || language == $language)
  && $tagSlug in tags[]->slug.current
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && ($authorSlug == null || author->slug.current == $authorSlug)
  && (count($categorySlugs) == 0 || category->slug.current in $categorySlugs)
  && ($yearStart == null || publishedAt >= $yearStart)
  && ($yearEnd == null || publishedAt < $yearEnd)`;

export const BLOG_TAG_POSTS_COUNT_QUERY = /* groq */ `count(*[
  ${TAG_POST_FILTER}
])`;

/**
 * Full topic/search listing post set for client-side filter/sort/paginate.
 * Includes sortUpdatedAt + viewCount for Updated / Popular sorts without a refetch.
 */
const LISTING_POST_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  "sortUpdatedAt": coalesce(lastModified, _updatedAt),
  "viewCount": coalesce(viewCount, 0),
  mainImage{
    ...,
    "alt": coalesce(alt, asset->altText)
  },
  "categorySlug": category->slug.current,
  "categoryTitle": category->title,
  "authorName": ${AUTHOR_REF}->name,
  "authorSlug": ${AUTHOR_REF}->slug.current,
  "authorImageUrl": ${AUTHOR_REF}->photo.asset->url,
  ${READING_TIME_MINUTES_PROJECTION}
}`;

export const BLOG_TAG_ALL_POSTS_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && $tagSlug in tags[]->slug.current
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)${LISTING_POST_FIELDS}`;

/**
 * Search match set for client-side category/sort/paginate (no category in GROQ).
 * Caps at 500 newest matches to bound RSC payload size.
 */
const SEARCH_ALL_POST_FILTER = /* groq */ `_type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && (
    title match $searchTerm
    || category->title match $searchTerm
    || excerpt match $searchTerm
    || pt::text(body) match $searchTerm
    || count(tags[@->title match $searchTerm]) > 0
  )`;

export const BLOG_SEARCH_ALL_POSTS_QUERY = /* groq */ `*[
  ${SEARCH_ALL_POST_FILTER}
] | order(publishedAt desc)[0...500]${LISTING_POST_FIELDS}`;

export const BLOG_TAG_POSTS_PAGE_NEWEST_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_TAG_POSTS_PAGE_OLDEST_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(publishedAt asc)[$start...$end]${POST_CARD_FIELDS}`;

export const BLOG_TAG_POSTS_PAGE_TITLE_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(title asc)[$start...$end]${POST_CARD_FIELDS}`;

/** Recently updated — editorial lastModified, falling back to Sanity _updatedAt. */
export const BLOG_TAG_POSTS_PAGE_UPDATED_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(coalesce(lastModified, _updatedAt) desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Most popular — viewCount desc, then publishedAt as tiebreaker. */
export const BLOG_TAG_POSTS_PAGE_POPULAR_QUERY = /* groq */ `*[
  ${TAG_POST_FILTER}
] | order(coalesce(viewCount, 0) desc, publishedAt desc)[$start...$end]${POST_CARD_FIELDS}`;

/** Other tags co-occurring on posts that carry $tagSlug (excludes the tag itself) — grouped by topic group in the sidebar. */
export const BLOG_TAG_COOCCURRING_TAGS_QUERY = /* groq */ `*[
  _type == "blogTag"
  && (language == $language || !defined(language))
  && slug.current != $tagSlug
  && _id in *[
    _type == "post"
  && (!defined(language) || language == $language)
    && $tagSlug in tags[]->slug.current
    && defined(publishedAt)
    && publishedAt <= now()
  ].tags[]._ref
] | order(title asc){
  _id,
  title,
  "slug": slug.current,
  "topicGroup": topicGroup->${TOPIC_GROUP_PROJECTION}
}`;

/** Authors with published posts carrying $tagSlug (sidebar facet). */
export const BLOG_TAG_AUTHORS_FACET_QUERY = /* groq */ `*[
  _type == "author"
  && _id in *[
    _type == "post"
  && (!defined(language) || language == $language)
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
  experience,
  shortBio,
  authorType,
  bio,
  "bioText": pt::text(bio),
  socialLinks[]{
    platform,
    url,
    label
  },
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
  && (!defined(language) || language == $language)
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

/** Authors eligible for sitemap: ≥2 published posts and a bio (short or long).
 * Thin authors (no bio / 0–1 posts) stay noindex and are omitted here.
 * Posts with language null/missing are treated as belonging to the default
 * language so authors seeded before the language field was added are included. */
export const AUTHORS_FOR_SITEMAP_QUERY = /* groq */ `*[
  _type == "author"
  && defined(slug.current)
  && allowIndex != false
  && (
    (defined(shortBio) && shortBio != "")
    || length(pt::text(bio)) > 0
  )
  && count(*[
    _type == "post"
    && (!defined(language) || language == $language)
    && author._ref == ^._id
    && defined(publishedAt)
    && publishedAt <= now()
  ]) > 1
]{
  "slug": slug.current,
  _updatedAt
}`;

/** Categories for sitemap — slug + lastmod. Separate from BLOG_CATEGORIES_QUERY to avoid changing its shape. */
export const CATEGORIES_FOR_SITEMAP_QUERY = /* groq */ `*[
  _type == "blogCategory"
  && defined(slug.current)
  && (!defined(language) || language == $language)
] | order(title asc){
  "slug": slug.current,
  _updatedAt
}`;

/** Populated tags for sitemap — only tags with at least one published post and allowIndex != false. */
export const TAGS_FOR_SITEMAP_QUERY = /* groq */ `*[
  _type == "blogTag"
  && defined(slug.current)
  && (!defined(language) || language == $language)
  && allowIndex != false
  && count(*[
    _type == "post"
    && (!defined(language) || language == $language)
    && defined(publishedAt)
    && publishedAt <= now()
    && ^._id in tags[]._ref
  ]) > 0
]{
  "slug": slug.current,
  _updatedAt
}`;

// ── Sitemap index pagination (PROD-1865) ─────────────────────────────────────

/** Total published post count — used by the sitemap index to calculate page groups. */
export const BLOG_SITEMAP_POST_COUNT_QUERY = /* groq */ `count(*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
])`;

/** Total populated tag count — used by the sitemap index to calculate page groups. */
export const BLOG_SITEMAP_TAG_COUNT_QUERY = /* groq */ `count(*[
  _type == "blogTag"
  && defined(slug.current)
  && (!defined(language) || language == $language)
  && allowIndex != false
  && count(*[
    _type == "post"
    && (!defined(language) || language == $language)
    && defined(publishedAt)
    && publishedAt <= now()
    && ^._id in tags[]._ref
  ]) > 0
])`;

/** Paginated posts for a sub-sitemap page. $start/$end are GROQ slice indices (end exclusive). */
export const BLOG_SITEMAP_POSTS_PAGE_QUERY = /* groq */ `*[
  _type == "post"
  && (!defined(language) || language == $language)
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && allowIndex != false
] | order(publishedAt desc)[$start...$end]{
  "slug": slug.current,
  "categorySlug": category->slug.current,
  "mainImageUrl": mainImage.asset->url,
  publishedAt,
  lastModified
}`;

/** Paginated populated tags for a sub-sitemap page. $start/$end are GROQ slice indices (end exclusive). */
export const BLOG_SITEMAP_TAGS_CANDIDATES_QUERY = /* groq */ `*[
  _type == "blogTag"
  && defined(slug.current)
  && (!defined(language) || language == $language)
] | order(title asc){
  "slug": slug.current,
  allowIndex,
  "postCount": count(*[
    _type == "post"
    && (!defined(language) || language == $language)
    && defined(publishedAt)
    && publishedAt <= now()
    && ^._id in tags[]._ref
  ])
}`;
