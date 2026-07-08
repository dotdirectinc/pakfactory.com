import Image from "next/image";
import { PortableText } from "@/components/ui/portable-text";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import {
  SocialPlatformIcon,
} from "@/components/modules/social-platform-icon";
import type { AuthorDoc } from "@/lib/blog-author";
import { isSocialPlatform } from "@pakfactory/sanity/social-platforms";
import { sanityImageUrl } from "@/lib/sanity-image";

type AuthorHeaderProps = {
  author: AuthorDoc;
};

/** Author profile hero: accent band, square photo, name (H1), role/tagline, bio, social links. */
export function AuthorHeader({ author }: AuthorHeaderProps) {
  const photoUrl = sanityImageUrl(author.photo, 596);
  const socialLinks =
    author.socialLinks?.filter(
      (link) =>
        link?.url?.trim() &&
        link.platform &&
        isSocialPlatform(link.platform) &&
        link.label?.trim(),
    ) ?? [];
  const subtitle = [author.role, author.tagline].filter(Boolean).join(" • ");
  const hasBio = Boolean(author.shortBio?.trim()) || Boolean(author.bio?.length);

  return (
    <PageDielineFullBleedSection sectionClassName="bg-accent" innerClassName="py-16 sm:py-24">
      <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-16">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={author.name}
            width={298}
            height={298}
            className="size-[240px] shrink-0 rounded-[14px] object-cover lg:size-[298px]"
            priority
          />
        ) : (
          <div
            className="size-[240px] shrink-0 rounded-[14px] bg-muted lg:size-[298px]"
            aria-hidden
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {author.name}
            </h1>
            {subtitle && (
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {(hasBio || socialLinks.length > 0) && (
            <div className="flex w-full flex-col gap-6 border-t border-dashed border-border pt-6">
              {author.shortBio?.trim() ? (
                <p className="max-w-3xl text-lg leading-7 text-muted-foreground">
                  {author.shortBio}
                </p>
              ) : author.bio?.length ? (
                <PortableText
                  value={author.bio}
                  className="max-w-3xl text-lg leading-7 text-muted-foreground"
                />
              ) : null}

              {socialLinks.length > 0 && (
                <ul className="flex flex-wrap gap-4">
                  {socialLinks.map((link) => (
                    <li key={`${link.platform}-${link.url}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <SocialPlatformIcon
                          platform={link.platform}
                          label={link.label}
                          size={24}
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </PageDielineFullBleedSection>
  );
}
