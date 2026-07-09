import Image from "next/image";
import Link from "next/link";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardData, toPostCardDataList } from "@/lib/post-card-data";
import type { PostCardData } from "@/lib/post-card-data";

const DEFAULT_HEADING = "Featured Posts";

type PostCategoryFeaturedRowProps = {
  heading?: string;
  posts?: HomePostCard[];
  categorySlug: string;
};

function PostMeta({ post }: { post: PostCardData }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {post.authorName ? (
        <span className="font-medium text-foreground">{post.authorName}</span>
      ) : null}
      {post.authorName && post.readingTimeLabel ? <span aria-hidden>·</span> : null}
      {post.readingTimeLabel ? <span>{post.readingTimeLabel}</span> : null}
      {(post.authorName || post.readingTimeLabel) && post.formattedDate ? (
        <span aria-hidden>·</span>
      ) : null}
      {post.formattedDate ? <span>{post.formattedDate}</span> : null}
    </p>
  );
}

/**
 * Category landing featured band — Figma node 2435:26983.
 * Two-column layout: large lead post left (2fr) with hero image + excerpt,
 * secondary text-only list right (1fr) with dashed dividers.
 */
export function PostCategoryFeaturedRow({
  heading,
  posts,
  categorySlug,
}: PostCategoryFeaturedRowProps) {
  const all = posts ?? [];
  const leadPost = all[0];
  if (!leadPost) return null;

  const lead = toPostCardData(leadPost, { categorySlug, imageWidth: 1200 });
  const secondary = toPostCardDataList(all.slice(1, 4), { categorySlug });
  const sectionHeading = heading?.trim() || DEFAULT_HEADING;

  return (
    <CategoryLandingSection>
      <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground lg:text-3xl">
          {sectionHeading}
        </h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr] lg:gap-10">
          {/* Lead post — hero image + full text */}
          <Link
            href={lead.href}
            className="group flex flex-col gap-5 text-foreground no-underline"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
              {lead.imageUrl ? (
                <Image
                  src={lead.imageUrl}
                  alt={lead.imageAlt ?? lead.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  priority
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-2.5">
              {lead.categoryTitle ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {lead.categoryTitle}
                </span>
              ) : null}
              <h3 className="text-2xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-3xl">
                {lead.title}
              </h3>
              {lead.excerpt ? (
                <p className="text-base leading-7 text-muted-foreground">
                  {lead.excerpt}
                </p>
              ) : null}
              <PostMeta post={lead} />
            </div>
          </Link>

          {/* Secondary list — text only, no images, dashed dividers */}
          {secondary.length > 0 ? (
            <ul className="flex flex-col border-t border-dashed border-border pt-5">
              {secondary.map((post, i) => (
                <li
                  key={post._id}
                  className={
                    i === 0
                      ? "pb-5"
                      : "border-t border-dashed border-border py-5"
                  }
                >
                  <Link
                    href={post.href}
                    className="group flex flex-col gap-2 text-foreground no-underline"
                  >
                    {post.categoryTitle ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {post.categoryTitle}
                      </span>
                    ) : null}
                    <h3 className="text-lg font-medium leading-7 text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <PostMeta post={post} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </CategoryLandingSection>
  );
}
