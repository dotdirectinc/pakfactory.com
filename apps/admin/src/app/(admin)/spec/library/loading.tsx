import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

/** Shown while the review list loads (PFP-124); the real title and description paint at once. */
export default function Loading() {
  return <PageSkeleton variant="table" width="7xl" header={<PageHeader title={COPY.title} lead={COPY.lead} />} />;
}
