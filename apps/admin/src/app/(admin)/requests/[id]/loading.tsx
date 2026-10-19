import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — A request. */
export default function Loading() {
  return <PageSkeleton variant="detail" width="7xl" />;
}
