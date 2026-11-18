import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_READINESS_COPY as COPY } from "@/lib/copy/spec-readiness";

/** Shown while maps and library decisions load; the real title and description paint at once. */
export default function Loading() {
  return (
    <PageSkeleton
      variant="table"
      width="7xl"
      header={<PageHeader title={COPY.title} lead={COPY.lead} />}
    />
  );
}
