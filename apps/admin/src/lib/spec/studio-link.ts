/**
 * "Edit in Studio" deep links for the read-only Spec System pages (PROD-2614).
 *
 * Until V1, admin never writes rules or catalog data: the edit happens in Studio and the page
 * follows on its next load. So every edit path is a link, and the link must open the dataset
 * admin is READING — a Studio pointed at another dataset would open a different document, or
 * none. That is why the origin is its own variable rather than a guess: with it unset the link
 * is hidden, not wrong.
 */
const WORKSPACE_BY_TYPE: Record<string, string> = {
  product: "products",
  customizationOption: "customization",
  customizationType: "customization",
};

export function studioEditUrl(type: string, id: string): string | null {
  const origin = process.env.ADMIN_SANITY_STUDIO_URL?.trim().replace(/\/$/, "");
  const workspace = WORKSPACE_BY_TYPE[type];
  if (!origin || !workspace) return null;
  return `${origin}/${workspace}/intent/edit/id=${encodeURIComponent(id)};type=${type}`;
}
