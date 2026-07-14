import Link from "next/link";
import type { PostTag } from "@/lib/blog-post";
import { tagHref } from "@/lib/blog-post-url";

type PostTagChipsProps = {
  tags: PostTag[];
};

export function PostTagChips({ tags }: PostTagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-dashed border-border pt-8">
      <p className="text-sm font-medium text-foreground">Topics</p>
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag._id ?? tag.slug}>
            <Link
              href={tagHref(tag.slug)}
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
            >
              {tag.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
