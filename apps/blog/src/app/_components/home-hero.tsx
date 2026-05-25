import type { HomePostCard } from "@/lib/blog-home";
import { PostCard } from "@/app/_components/post-card";

type HomeHeroProps = {
  featured: HomePostCard | null;
  latest: HomePostCard[];
};

export function HomeHero({ featured, latest }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-hero-heading" className="border-b pb-10">
      <h2 id="home-hero-heading" className="sr-only">
        Featured and latest articles
      </h2>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          {featured ? (
            <PostCard post={featured} variant="featured" />
          ) : (
            <p className="text-muted-foreground">
              No featured post yet. Pin one in Studio with &quot;Feature on blog home&quot;.
            </p>
          )}
        </div>
        <div>
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Latest
          </p>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published posts yet.</p>
          ) : (
            <ul className="divide-y">
              {latest.map((post) => (
                <li key={post._id} className="py-4 first:pt-0 last:pb-0">
                  <PostCard post={post} variant="compact" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
