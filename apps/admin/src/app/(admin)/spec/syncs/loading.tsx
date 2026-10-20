import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_SPEC_SYNC_HISTORY_COPY as COPY } from "@/lib/copy/spec";

/**
 * Shown the moment the link is clicked, while the server builds the page — Sync history. Its real title and
 * description show at once: the description is the page's largest text (its LCP), painted with the first frame.
 */
export default function Loading() {
  return (
    <PageSkeleton
      variant="list"
      width="5xl"
      header={
        <PageHeader
          title={COPY.title}
          lead={COPY.lead}
          leadClassName="max-w-2xl"
          back={{ href: "/spec", label: COPY.back }}
        />
      }
    />
  );
}
