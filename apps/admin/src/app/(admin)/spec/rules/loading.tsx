import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SpecFutureAction } from "@/components/spec/spec-future-action";
import { ADMIN_SPEC_FUTURE_COPY, ADMIN_SPEC_RULES_COPY as COPY } from "@/lib/copy/spec";

/**
 * Shown the moment the link is clicked, while the server builds the page — Rules. Its real title and
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
          leadClassName="max-w-2xl"
          aside={<SpecFutureAction label={ADMIN_SPEC_FUTURE_COPY.addRule} />}
        />
      }
    />
  );
}
