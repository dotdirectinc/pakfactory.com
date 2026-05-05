import type { BreadcrumbItem } from "../types";

export function breadcrumbList(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  const itemListElement = items.map((item, index) => {
    const position = index + 1;
    return {
      "@type": "ListItem",
      position,
      name: item.name,
      item: item.url,
    };
  });

  return {
    "@type": "BreadcrumbList",
    itemListElement,
  };
}
