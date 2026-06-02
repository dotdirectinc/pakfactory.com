import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import type { BlogCategoryChip } from "@/lib/blog-categories";
import { categoryHref } from "@/lib/blog-post-url";

type ArchiveFilterSidebarProps = {
  categories: BlogCategoryChip[];
};

/**
 * Navigational sidebar for the all-posts archive (PROD-1498).
 * Category filtering logic ships with category archive routes (PROD-1499).
 */
export function ArchiveFilterSidebar({ categories }: ArchiveFilterSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Browse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium text-muted-foreground">Archive</p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/all"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  aria-current="page"
                >
                  All posts
                </Link>
              </li>
            </ul>
          </div>
          {categories.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Categories</p>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat._id ?? cat.slug}>
                    <Link
                      href={categoryHref(cat.slug)}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {cat.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
