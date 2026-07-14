import { CaseStudiesListingPage, buildCaseStudiesListingMetadata } from "./_components/case-studies-listing-page";

export const revalidate = 300;

export async function generateMetadata() {
  return buildCaseStudiesListingMetadata(1);
}

export default async function CaseStudiesPage() {
  return <CaseStudiesListingPage initialPage={1} />;
}
