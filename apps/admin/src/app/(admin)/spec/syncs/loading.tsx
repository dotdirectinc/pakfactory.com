import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Sync history. */
export default function Loading() {
  return <PageSkeleton variant="list" width="5xl" />;
}
