import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { PostTag } from "@/lib/blog-post";
import { tagHref } from "@/lib/blog-post-url";

type PostTagChipsProps = {
  tags: PostTag[];
};

export function PostTagChips({ tags }: PostTagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <section className="mt-16 border-t border-dashed border-border pt-10" aria-labelledby="post-topics-heading">
      <h2 id="post-topics-heading" className="text-sm font-medium text-muted-foreground">
        Topics
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag._id ?? tag.slug}>
            <Badge variant="outline" asChild>
              <Link href={tagHref(tag.slug)}>{tag.title}</Link>
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
