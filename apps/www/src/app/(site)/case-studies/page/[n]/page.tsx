import { notFound, redirect } from "next/navigation";
import {
  CaseStudiesListingPage,
  CASE_STUDIES_BASE_PATH,
  buildCaseStudiesListingMetadata,
  fetchCaseStudiesListing,
} from "../../_components/case-studies-listing-page";
import { CASE_STUDIES_DEFAULT_PAGE_SIZE } from "../../_components/case-studies-listing-constants";
import { staticParamsExceptPreview } from "@/lib/static-params";

export const revalidate = 300;

/**
 * Prebuild pages 2..last at the default page size, so the paginated listing is
 * served from the CDN like `/case-studies` (PROD-2754 follow-up). Without this
 * the dynamic segment rendered on every request. Other numbers still render on
 * demand (and are then cached); invalid ones 404 and page 1 redirects below.
 */
export async function generateStaticParams(): Promise<{ n: string }[]> {
  return staticParamsExceptPreview(async () => {
    const { studies } = await fetchCaseStudiesListing();
    const pageCount = Math.ceil(studies.length / CASE_STUDIES_DEFAULT_PAGE_SIZE);
    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => ({
      n: String(i + 2),
    }));
  });
}

type PageProps = {
  params: Promise<{ n: string }>;
};

function parsePageParam(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({ params }: PageProps) {
  const { n } = await params;
  const pageNumber = parsePageParam(n);
  if (pageNumber == null) return {};
  return buildCaseStudiesListingMetadata(pageNumber);
}

export default async function CaseStudiesPaginatedPage({ params }: PageProps) {
  const { n } = await params;
  const pageNumber = parsePageParam(n);
  if (pageNumber == null) notFound();
  if (pageNumber === 1) redirect(CASE_STUDIES_BASE_PATH);

  return <CaseStudiesListingPage initialPage={pageNumber} />;
}
