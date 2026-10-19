import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Home and any admin page without its own loading state. */
export default function Loading() {
  return <PageSkeleton variant="sections" width="7xl" />;
}
