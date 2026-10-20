import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown the moment the link is clicked, while the server builds the page — Home. Its own route group, so it wraps Home only — a loading state above other pages would stand in for them on a first load. */
export default function Loading() {
  return <PageSkeleton variant="sections" width="7xl" />;
}
