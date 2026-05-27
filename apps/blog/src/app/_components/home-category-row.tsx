import Link from "next/link";
import type { HomeCategoryRow } from "@/lib/blog-home";
import { PostCard } from "@/app/_components/post-card";
import { categoryHref } from "@/lib/blog-post-url";

type HomeCategoryRowSectionProps = {
  row: HomeCategoryRow;
};

export function HomeCategoryRowSection({ row }: HomeCategoryRowSectionProps) {
  return (
    <section className="border-b py-10" aria-labelledby={`category-${row.slug}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id={`category-${row.slug}`} className="text-xl font-semibold tracking-tight">
          {row.title}
        </h2>
        <Link
          href={categoryHref(row.slug)}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          View All →
        </Link>
      </div>
      {row.posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {row.posts.map((post) => (
            <li key={post._id}>
              <PostCard post={post} categorySlug={row.slug} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
