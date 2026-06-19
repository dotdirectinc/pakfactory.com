import {
  breadcrumbList,
  jsonLdGraph,
  organization,
  person,
  serializeJsonLd,
} from "@pakfactory/seo";
import type { AuthorDoc } from "@/lib/blog-author";
import { authorHref } from "@/lib/blog-post-url";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

/** Stable `@id` for an author's Person node — shared by the author page and every post's Article.author. */
export function authorPersonId(authorSlug: string): string {
  return `${absoluteUrl(authorHref(authorSlug))}#person`;
}

export function buildAuthorJsonLd(author: AuthorDoc, photoUrl?: string): string {
  const pageUrl = absoluteUrl(authorHref(author.slug));
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const orgId = `${wwwUrl}#organization`;

  const org = organization({ name: "PakFactory", url: wwwUrl, id: orgId });

  const personNode = person({
    id: authorPersonId(author.slug),
    name: author.name,
    url: pageUrl,
    image: photoUrl,
    jobTitle: author.role,
    description: author.shortBio?.trim() || author.bioText?.trim() || undefined,
    sameAs:
      author.socialLinks?.filter((url) => url?.trim()).length
        ? author.socialLinks.filter((url) => url?.trim())
        : undefined,
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    { name: author.name, url: pageUrl },
  ]);

  return serializeJsonLd(jsonLdGraph([org, personNode, crumbs]));
}
