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
