import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Help. */
export default function Loading() {
  return <PageSkeleton variant="article" width="3xl" />;
}
