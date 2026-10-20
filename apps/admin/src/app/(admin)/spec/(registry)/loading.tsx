import { ActionSkeleton, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_COPY, ADMIN_SPEC_REGISTRY_COPY as COPY } from "@/lib/copy/spec";

/**
 * Shown the moment the link is clicked, while the server builds the page — Spec registry: header with Sync
 * Changes, tabs, then its sections. Its real title and description show at once: the description is the
 * page's largest text (its LCP), painted with the first frame.
 */
export default function Loading() {
  return (
    <PageSkeleton
      variant="sections"
      width="6xl"
      tabs
      header={
        <PageHeader
          title={ADMIN_SPEC_COPY.listTitle}
          lead={COPY.lead}
          leadClassName="max-w-xl"
          aside={<ActionSkeleton />}
        />
      }
    />
  );
}
