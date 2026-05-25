import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { BlogCategoryChip } from "@/lib/blog-categories";

type CategoryChipsProps = {
  categories: BlogCategoryChip[];
  className?: string;
};

export function CategoryChips({ categories, className }: CategoryChipsProps) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Blog categories" className={className}>
      <ul className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <li key={cat._id ?? cat.slug}>
            <Badge variant="secondary" asChild>
              <Link href={`/category/${cat.slug}`}>{cat.title}</Link>
            </Badge>
          </li>
        ))}
      </ul>
    </nav>
  );
}
