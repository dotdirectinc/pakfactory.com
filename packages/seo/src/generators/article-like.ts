import type { ArticleLikeInput } from "../types";

export function articleLike(
  type: "BlogPosting" | "NewsArticle" | "Article",
  input: ArticleLikeInput,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": type,
    headline: input.headline,
    url: input.url,
    publisher: input.publisher,
  };

  if (input.datePublished) doc.datePublished = input.datePublished;

  if (input.id) doc["@id"] = input.id;
  if (input.dateModified) doc.dateModified = input.dateModified;
  if (input.description) doc.description = input.description;

  if (input.image !== undefined) {
    doc.image = Array.isArray(input.image) ? [...input.image] : input.image;
  }

  if (input.author) doc.author = input.author;

  doc.mainEntityOfPage =
    input.mainEntityOfPage ?? {
      "@type": "WebPage",
      "@id": input.url,
    };

  if (input.articleSection) doc.articleSection = input.articleSection;

  if (input.keywords !== undefined) {
    doc.keywords =
      typeof input.keywords === "string"
        ? input.keywords
        : [...input.keywords].join(", ");
  }

  return doc;
}
