import { redirectOrNotFound } from "@/lib/blog-redirects";

export const revalidate = 60;

/**
 * Multi-segment unknown paths (e.g. `/old-cat/old-post`). Check for a CMS
 * redirect on the full path first (legacy scoped URLs), otherwise render the
 * app `not-found.tsx` rather than a Vercel platform 404.
 */
export default async function UnmatchedMultiSegmentPath({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return redirectOrNotFound(`/${segments.join("/")}`);
}
