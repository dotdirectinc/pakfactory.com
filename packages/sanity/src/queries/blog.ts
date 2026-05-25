/**
 * Blog 3.0 GROQ — field names match `apps/studio/schemas` (post, blogCategory, author).
 * Popular posts: no `viewCount` on post yet; month window with publishedAt fallback in app code.
 */

export const BLOG_CATEGORIES_QUERY = /* groq */ `*[_type == "blogCategory" && defined(slug.current)] | order(title asc){
  _id,
  title,
  "slug": slug.current
}`;

/** Posts published in the current calendar month (UTC), newest first. */
export const POPULAR_POSTS_THIS_MONTH_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
  && publishedAt >= $monthStart
] | order(publishedAt desc)[0...3]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage
}`;

const POST_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage,
  "categoryTitle": category->title,
  "authorName": author->name
}`;

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

/** Industry pills for blog home (studio `industry` documents). */
export const INDUSTRIES_FOR_BLOG_HOME_QUERY = /* groq */ `*[
  _type == "industry"
  && defined(slug.current)
] | order(coalesce(order, 999) asc)[0...10]{
  _id,
  title,
  "slug": slug.current
}`;

/** Latest published posts when the month window returns fewer than three. */
export const POPULAR_POSTS_LATEST_QUERY = /* groq */ `*[
  _type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt <= now()
] | order(publishedAt desc)[0...3]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage
}`;
