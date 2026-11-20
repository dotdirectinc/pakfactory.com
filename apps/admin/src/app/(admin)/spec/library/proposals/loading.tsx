import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewTabsStatic } from "@/components/spec/spec-section-tabs";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

/** Shown the moment the Proposals tab is clicked, with the tab bar and the page's own title. */
export default function Loading() {
  const COPY = ADMIN_SPEC_LIBRARY_COPY.proposals;
  return (
    <PageSkeleton
      variant="list"
      width="6xl"
      above={<ReviewTabsStatic active="proposals" />}
      header={<PageHeader title={COPY.title} lead={COPY.lead} />}
    />
  );
}
