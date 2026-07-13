import { person } from "@pakfactory/seo";
import type { AuthorDoc } from "@/lib/blog-author";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { authorHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";

/** Stable `@id` for an author's Person node — shared by the author page and every post's Article.author. */
export function authorPersonId(authorSlug: string): string {
  return `${absoluteUrl(authorHref(authorSlug))}#person`;
}

export function buildAuthorJsonLd(author: AuthorDoc, photoUrl?: string): string {
  const pageUrl = absoluteUrl(authorHref(author.slug));
  const { org, orgId } = pakfactoryOrganization();

  const personNode = person({
    id: authorPersonId(author.slug),
    name: author.name,
    url: pageUrl,
    image: photoUrl,
    jobTitle: author.role,
    description: author.bioText?.trim() || undefined,
    ...(author.authorType === "staff" ? { worksFor: { "@id": orgId } } : {}),
    sameAs: (() => {
      const urls =
        author.socialLinks
          ?.map((link) => link.url?.trim())
          .filter((url): url is string => Boolean(url)) ?? [];
      return urls.length > 0 ? urls : undefined;
    })(),
  });

  const crumbs = blogBreadcrumbList([{ name: author.name, url: pageUrl }]);

  return serializeBlogJsonLd([org, personNode, crumbs]);
}
