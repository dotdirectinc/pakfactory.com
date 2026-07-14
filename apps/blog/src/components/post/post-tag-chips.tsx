import Link from "next/link";
import type { PostTag } from "@/lib/blog-post";
import { tagHref } from "@/lib/blog-post-url";
import { TOPIC_CHIP_CLASS } from "@/components/ui/topic-chip";

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
            <Link href={tagHref(tag.slug)} className={TOPIC_CHIP_CLASS}>
              {tag.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
