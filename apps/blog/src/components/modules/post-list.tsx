import type { ReactNode } from "react";
import { PostCard, type PostCardData } from "@/components/modules/post-card";

type PostListColumns = 2 | 3 | 4;

const COLUMN_CLASSES: Record<PostListColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

type PostListProps = {
  posts: PostCardData[];
  variant?:
    | "default"
    | "compact"
    | "featured"
    | "horizontal"
    | "headline"
    | "rail";
  columns?: PostListColumns;
  layout?: "grid" | "list";
  emptyMessage?: string;
  /** Optional section heading (e.g. "Popular this month"). */
  heading?: string;
  headingId?: string;
  className?: string;
};

export function PostList({
  posts,
  variant = "default",
  columns = 3,
  layout = "grid",
  emptyMessage,
  heading,
  headingId,
  className,
}: PostListProps) {
  if (posts.length === 0) {
    if (!emptyMessage) return null;
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  let list: ReactNode;

  if (
    layout === "list" ||
    variant === "headline" ||
    variant === "rail" ||
    variant === "horizontal"
  ) {
    list = (
      <ul
        className={
          className ?? (variant === "horizontal" ? "space-y-6" : "space-y-4")
        }
      >
        {posts.map((post) => (
          <li key={post._id}>
            <PostCard post={post} variant={variant} />
          </li>
        ))}
      </ul>
    );
  } else if (variant === "compact") {
    list = (
      <ul className={className ?? "divide-y"}>
        {posts.map((post) => (
          <li key={post._id} className="py-4 first:pt-0 last:pb-0">
            <PostCard post={post} variant="compact" />
          </li>
        ))}
      </ul>
    );
  } else {
    list = (
      <ul className={className ?? `grid gap-6 ${COLUMN_CLASSES[columns]}`}>
        {posts.map((post) => (
          <li key={post._id}>
            <PostCard post={post} variant={variant} />
          </li>
        ))}
      </ul>
    );
  }

  if (!heading) return list;

  const id = headingId ?? "post-list-heading";
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {heading}
      </h2>
      <div className="mt-4">{list}</div>
    </section>
  );
}
