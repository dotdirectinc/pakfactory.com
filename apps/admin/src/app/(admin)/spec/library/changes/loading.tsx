import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewTabsStatic } from "@/components/spec/spec-section-tabs";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

/** Shown the moment the Held changes tab is clicked, with the tab bar and the page's own title. */
export default function Loading() {
  return (
    <PageSkeleton
      variant="list"
      width="6xl"
      above={<ReviewTabsStatic active="held" />}
      header={<PageHeader title={COPY.changes.title} lead={COPY.changes.lead} />}
    />
  );
}
