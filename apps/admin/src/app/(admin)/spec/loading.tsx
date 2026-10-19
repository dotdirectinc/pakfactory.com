import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Spec registry: header with Sync Changes, tabs, then its sections. */
export default function Loading() {
  return <PageSkeleton variant="sections" width="6xl" tabs action />;
}
