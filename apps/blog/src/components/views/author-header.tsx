import Image from "next/image";
import { PortableText } from "@/components/ui/portable-text";
import type { AuthorDoc } from "@/lib/blog-author";
import { sanityImageUrl } from "@/lib/sanity-image";

type AuthorHeaderProps = {
  author: AuthorDoc;
};

function socialLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("twitter") || host === "x.com") return "X";
    return host;
  } catch {
    return "Profile";
  }
}

/** Author profile header: photo, role, name (H1), tagline, bio, social links. */
export function AuthorHeader({ author }: AuthorHeaderProps) {
  const photoUrl = sanityImageUrl(author.photo, 240);
  const socialLinks = author.socialLinks?.filter((url) => url?.trim()) ?? [];

  return (
    <header className="mb-10">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {photoUrl && (
          <Image
            src={photoUrl}
            alt={author.name}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        )}
        <div>
          {author.role && (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {author.role}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {author.name}
          </h1>
          {author.tagline && (
            <p className="mt-2 text-sm text-muted-foreground">{author.tagline}</p>
          )}
        </div>
      </div>

      {author.shortBio && (
        <p className="mt-6 max-w-2xl text-base text-muted-foreground">
          {author.shortBio}
        </p>
      )}

      {author.bio?.length ? (
        <PortableText
          value={author.bio}
          className="mt-6 max-w-2xl text-base text-muted-foreground"
        />
      ) : null}

      {socialLinks.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-4">
          {socialLinks.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                {socialLabel(url)} →
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
