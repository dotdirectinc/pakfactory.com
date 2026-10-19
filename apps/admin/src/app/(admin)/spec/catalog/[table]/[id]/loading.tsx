import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — A catalog record. */
export default function Loading() {
  return <PageSkeleton variant="detail" width="7xl" />;
}
