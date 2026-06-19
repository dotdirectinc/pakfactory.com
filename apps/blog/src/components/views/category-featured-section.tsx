import { PostCard, type PostCardData } from "@/components/modules/post-card";
import { CategoryLandingSection } from "@/components/views/category-landing-layout";

type CategoryFeaturedSectionProps = {
  hero: PostCardData | null;
  secondary: PostCardData[];
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

/** Figma "Featured Posts" — hero + 3-card row (placeholder or preview cards in Phase 1). */
export function CategoryFeaturedSection({
  hero,
  secondary,
}: CategoryFeaturedSectionProps) {
  const secondarySlots = [0, 1, 2] as const;

  return (
    <CategoryLandingSection>
      <h2 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">
        Featured Posts
      </h2>
      <div className="mt-8 flex flex-col gap-10">
        {hero ? (
          <PostCard post={hero} variant="categoryHero" showFeaturedBadge />
        ) : (
          <FeaturedPlaceholder variant="hero" />
        )}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {secondarySlots.map((index) => {
            const post = secondary[index];
            return (
              <li key={post?._id ?? `featured-placeholder-${index}`}>
                {post ? (
                  <PostCard post={post} showFeaturedBadge />
                ) : (
                  <FeaturedPlaceholder variant="card" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </CategoryLandingSection>
  );
}
