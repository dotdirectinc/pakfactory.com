import { PostCard } from "@/components/modules/post-card";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";
import type { HomePostCard } from "@/lib/blog-home";
import { toPostCardDataList } from "@/lib/post-card-data";

const DEFAULT_HEADING = "Featured Posts";

type PostCategoryFeaturedRowProps = {
  heading?: string;
  posts?: HomePostCard[];
  categorySlug: string;
};

function FeaturedPlaceholder({ variant }: { variant: "hero" | "card" }) {
  if (variant === "hero") {
    return (
      <article className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-h-[240px] flex-1 rounded-[14px] bg-muted lg:min-h-[400px]" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-10 w-full max-w-lg rounded-md bg-muted" />
          <div className="h-12 w-full rounded-md bg-muted" />
          <div className="h-5 w-48 rounded-md bg-muted" />
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-6">
      <div className="h-60 min-h-[180px] rounded-[14px] bg-muted" />
      <div className="flex flex-col gap-3">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-8 w-full rounded-md bg-muted" />
        <div className="h-4 w-40 rounded-md bg-muted" />
      </div>
    </article>
  );
}

/**
 * Category landing featured band (Figma hero + 3 cards).
 * Posts resolve from `featuredInCategory` on post documents.
 */
export function PostCategoryFeaturedRow({
  heading,
  posts,
  categorySlug,
}: PostCategoryFeaturedRowProps) {
  const cards = toPostCardDataList(posts ?? [], {
    categorySlug,
    imageWidth: 900,
  });
  const hero = cards[0] ?? null;
  const secondary = cards.slice(1, 4);
  const secondarySlots = [0, 1, 2] as const;
  const sectionHeading = heading?.trim() || DEFAULT_HEADING;

  if (!hero && secondary.length === 0) return null;

  return (
    <CategoryLandingSection>
      <h2 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">
        {sectionHeading}
      </h2>
      <div className="mt-12 flex flex-col gap-16">
        {hero ? (
          <PostCard post={hero} variant="categoryHero" showFeaturedBadge />
        ) : (
          <FeaturedPlaceholder variant="hero" />
        )}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {secondarySlots.map((slot) => {
            const card = secondary[slot];
            return card ? (
              <PostCard key={card._id} post={card} showFeaturedBadge />
            ) : (
              <FeaturedPlaceholder key={slot} variant="card" />
            );
          })}
        </div>
      </div>
    </CategoryLandingSection>
  );
}
