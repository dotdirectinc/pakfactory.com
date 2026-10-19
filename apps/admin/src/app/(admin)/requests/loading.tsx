import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Requests list. */
export default function Loading() {
  return <PageSkeleton variant="table" width="7xl" />;
}
