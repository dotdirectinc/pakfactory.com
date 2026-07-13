import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";
import { authorHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";

export type PostAuthor = {
  name?: string;
  slug?: string | null;
  photo?: unknown;
  role?: string;
  experience?: string;
  shortBio?: string;
};

type PostAuthorCardProps = {
  author?: PostAuthor;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** "Written by" author card — avatar, linked name, clamped bio. */
export function PostAuthorCard({ author }: PostAuthorCardProps) {
  const name = author?.name?.trim();
  if (!name) return null;

  const photoUrl = sanityImageUrl(author?.photo, 128);
  const bio = author?.shortBio?.trim() || author?.experience?.trim();

  const role = author?.role?.trim();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">Written by</p>
      <div className="flex flex-col gap-4">
        {author?.slug ? (
          <Link
            href={authorHref(author.slug)}
            className="group flex w-fit items-center gap-3 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Avatar className="size-10 shrink-0">
              {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="block font-semibold text-foreground transition-colors group-hover:text-foreground/80">
                {name}
              </span>
              {role ? (
                <span className="block text-sm text-muted-foreground">{role}</span>
              ) : null}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0">
              {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="block font-semibold text-foreground">{name}</span>
              {role ? (
                <span className="block text-sm text-muted-foreground">{role}</span>
              ) : null}
            </div>
          </div>
        )}
        {bio ? (
          <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
            {bio}
          </p>
        ) : null}
      </div>
    </div>
  );
}
