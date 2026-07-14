import { permanentRedirect } from "next/navigation";

/**
 * Legacy category-scoped post URL (`/{category}/{postSlug}`, PROD-1597).
 * Posts are now canonical at `/{postSlug}` (root) — permanently redirect.
 * `permanentRedirect` emits 308 (App Router's permanent redirect; SEO-equivalent
 * to 301). All two-segment paths redirect; the destination handles 404s.
 */
type PageProps = {
  params: Promise<{ category: string; postSlug: string }>;
};

export default async function LegacyCategoryPostRedirect({ params }: PageProps) {
  const { postSlug } = await params;
  permanentRedirect(`/${postSlug}`);
}
