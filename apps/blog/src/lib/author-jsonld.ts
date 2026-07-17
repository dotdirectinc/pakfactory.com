import { person, profilePage } from "@pakfactory/seo";
import type { AuthorDoc } from "@/lib/blog-author";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { authorHref } from "@/lib/blog-post-url";
import { fetchSeoContext } from "@/lib/seo-context";
import { absoluteUrl } from "@/lib/site";

/** Stable `@id` for an author's Person node — shared by the author page and every post's Article.author. */
export function authorPersonId(authorSlug: string): string {
  return `${absoluteUrl(authorHref(authorSlug))}#person`;
}

export async function buildAuthorJsonLd(
  author: AuthorDoc,
  photoUrl?: string,
): Promise<string> {
  const pageUrl = absoluteUrl(authorHref(author.slug));
  const personId = authorPersonId(author.slug);
  const ctx = await fetchSeoContext();
  const { org, orgId } = pakfactoryOrganization({
    logo: ctx.organizationLogoUrl ?? undefined,
  });

  const personNode = person({
    id: personId,
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

  // Wrap the page as a ProfilePage whose subject is the Person (PROD-2120).
  const profile = profilePage({
    name: author.name,
    url: pageUrl,
    id: `${pageUrl}#profilepage`,
    mainEntity: { "@id": personId },
    description: author.bioText?.trim() || undefined,
  });

  return serializeBlogJsonLd([profile, org, personNode, crumbs]);
}
