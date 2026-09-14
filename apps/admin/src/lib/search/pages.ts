import type { AdminSearchHit } from "./types";

export const ADMIN_SEARCH_PAGES: AdminSearchHit[] = [
  {
    id: "page-requests",
    kind: "page",
    title: "Requests",
    subtitle: "Admin · /requests",
    href: "/requests",
    badge: "Page",
  },
  {
    id: "page-home",
    kind: "page",
    title: "Home",
    subtitle: "Admin · /",
    href: "/",
    badge: "Page",
  },
  {
    id: "page-settings",
    kind: "page",
    title: "Settings",
    subtitle: "Coming soon",
    href: "/requests",
    badge: "Soon",
  },
];

export function filterAdminPages(query: string): AdminSearchHit[] {
  const q = query.trim().toLowerCase();
  const pages = ADMIN_SEARCH_PAGES.filter((p) => p.id !== "page-settings");
  if (!q) return pages;
  return ADMIN_SEARCH_PAGES.filter((page) => {
    const haystack = `${page.title} ${page.subtitle ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}
