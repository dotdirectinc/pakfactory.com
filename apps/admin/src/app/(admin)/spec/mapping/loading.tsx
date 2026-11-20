import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewTabsStatic } from "@/components/spec/spec-section-tabs";
import { ADMIN_SPEC_MAPPING_COPY as COPY } from "@/lib/copy/spec-mapping";

/** Shown the moment the Mapping tab is clicked (it had none, so a click seemed to do nothing). */
export default function Loading() {
  return (
    <PageSkeleton
      variant="table"
      width="7xl"
      above={<ReviewTabsStatic active="mapping" />}
      header={<PageHeader title={COPY.title} lead={COPY.lead} />}
    />
  );
}
