import { notFound } from "next/navigation";

/**
 * Multi-segment unknown paths (e.g. `/foo/bar`) — render app `not-found.tsx`
 * instead of a Vercel platform 404. Single-segment paths use `[slug]/page.tsx`.
 */
export default function UnmatchedMultiSegmentPath() {
  notFound();
}
