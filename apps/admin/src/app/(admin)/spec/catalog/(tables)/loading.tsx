import { ActionSkeleton, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

/**
 * Shown the moment the link is clicked, while the server builds the page — Catalog tables. Its real title and
 * description show at once: the description is the page's largest text (its LCP), painted with the first frame.
 */
export default function Loading() {
  return (
    <PageSkeleton
      variant="table"
      width="7xl"
      tabs
      header={
        <PageHeader
          title={COPY.title}
          lead={COPY.lead}
          aside={<ActionSkeleton />}
        />
      }
    />
  );
}
