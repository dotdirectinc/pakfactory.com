import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Control gallery. */
export default function Loading() {
  return <PageSkeleton variant="sections" width="full" />;
}
