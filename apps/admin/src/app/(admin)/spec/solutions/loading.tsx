import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Solutions. */
export default function Loading() {
  return <PageSkeleton variant="table" width="7xl" />;
}
