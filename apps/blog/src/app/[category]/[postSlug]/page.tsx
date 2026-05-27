import { notFound, permanentRedirect } from "next/navigation";
import { isKnownCategorySlug } from "@/lib/blog-categories";

/**
 * Legacy category-scoped post URL (`/{category}/{postSlug}`, PROD-1597).
 * Posts are now canonical at `/{postSlug}` (root) — permanently redirect.
 * `permanentRedirect` emits 308 (App Router's permanent redirect; SEO-equivalent
 * to 301). Only known-category two-segment paths redirect; anything else 404s.
 */
type PageProps = {
  params: Promise<{ category: string; postSlug: string }>;
};

export default async function LegacyCategoryPostRedirect({ params }: PageProps) {
  const { category, postSlug } = await params;
  if (!isKnownCategorySlug(category)) notFound();
  permanentRedirect(`/${postSlug}`);
}
