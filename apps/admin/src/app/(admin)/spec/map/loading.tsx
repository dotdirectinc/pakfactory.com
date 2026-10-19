import { PageSkeleton } from "@/components/loading/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Spec Map: columns of cards. */
export default function Loading() {
  return <PageSkeleton variant="map" width="full" />;
}
