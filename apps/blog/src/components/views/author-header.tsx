import Image from "next/image";
import { PortableText } from "@/components/ui/portable-text";
import type { AuthorDoc } from "@/lib/blog-author";
import { sanityImageUrl } from "@/lib/sanity-image";

type AuthorHeaderProps = {
  author: AuthorDoc;
};

/** Author profile header: circular photo, role, name (H1), bio, credentials, LinkedIn. */
export function AuthorHeader({ author }: AuthorHeaderProps) {
  const photoUrl = sanityImageUrl(author.photo, 240);

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
        </div>
      </div>

      {author.bio?.length ? (
        <PortableText
          value={author.bio}
          className="mt-6 max-w-2xl text-base text-muted-foreground"
        />
      ) : null}

      {author.credentials?.length ? (
        <section className="mt-6 max-w-2xl" aria-labelledby="author-credentials">
          <h2
            id="author-credentials"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Credentials &amp; experience
          </h2>
          <PortableText
            value={author.credentials}
            className="mt-2 text-sm text-muted-foreground"
          />
        </section>
      ) : null}

      {author.linkedIn && (
        <a
          href={author.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Connect on LinkedIn →
        </a>
      )}
    </header>
  );
}
