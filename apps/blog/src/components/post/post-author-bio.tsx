import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";
import { authorHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";

type PostAuthorBioProps = {
  name?: string;
  slug?: string | null;
  role?: string;
  tagline?: string;
  shortBio?: string;
  photo?: unknown;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function PostAuthorBio({
  name,
  slug,
  role,
  tagline,
  shortBio,
  photo,
}: PostAuthorBioProps) {
  if (!name?.trim()) return null;

  const photoUrl = sanityImageUrl(photo, 200);
  const bio = shortBio?.trim() || tagline?.trim();

  return (
    <section
      className="mt-16 rounded-xl border border-border bg-muted/20 p-6 sm:p-8"
      aria-labelledby="post-author-heading"
    >
      <h2 id="post-author-heading" className="sr-only">
        About the author
      </h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="size-16">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link
              href={authorHref(slug)}
              className="text-lg font-semibold text-foreground hover:underline"
            >
              {name}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-foreground">{name}</p>
          )}
          {role ? <p className="text-sm text-muted-foreground">{role}</p> : null}
          {bio ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{bio}</p> : null}
        </div>
      </div>
    </section>
  );
}
