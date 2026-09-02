import { notFound, redirect } from "next/navigation";
import {
  CaseStudiesListingPage,
  CASE_STUDIES_BASE_PATH,
  buildCaseStudiesListingMetadata,
} from "../../_components/case-studies-listing-page";

export const revalidate = 300;

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
