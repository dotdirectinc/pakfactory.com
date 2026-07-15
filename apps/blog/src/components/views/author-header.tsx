import { PortableText } from "@/components/ui/portable-text";
import { SanityImage } from "@/components/ui/sanity-image";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import {
  SocialPlatformIcon,
} from "@/components/modules/social-platform-icon";
import type { AuthorDoc } from "@/lib/blog-author";
import { isSocialPlatform } from "@pakfactory/sanity/social-platforms";
import { sanityImageBaseUrl } from "@/lib/sanity-image";
import { EXTERNAL_LINK_REL } from "@/lib/external-link";

type AuthorHeaderProps = {
  author: AuthorDoc;
};

/** Author profile hero: role above name, experience below name, long bio, social links. */
export function AuthorHeader({ author }: AuthorHeaderProps) {
  const photoUrl = sanityImageBaseUrl(author.photo);
  const socialLinks =
    author.socialLinks?.filter(
      (link) =>
        link?.url?.trim() &&
        link.platform &&
        isSocialPlatform(link.platform) &&
        link.label?.trim(),
    ) ?? [];
  const hasBio = Boolean(author.bio?.length);

  return (
    <PageDielineFullBleedSection sectionClassName="bg-accent" innerClassName="py-16 sm:py-24">
      <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-start lg:gap-16">
        {photoUrl ? (
          <SanityImage
            src={photoUrl}
            alt={author.name}
            width={298}
            height={298}
            sizes="(min-width: 1024px) 298px, 240px"
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
            {author.role && (
              <p className="text-lg text-muted-foreground">{author.role}</p>
            )}
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {author.name}
            </h1>
            {author.experience && (
              <p className="text-lg text-muted-foreground">{author.experience}</p>
            )}
          </div>

          {(hasBio || socialLinks.length > 0) && (
            <div className="flex w-full flex-col gap-6 border-t border-dashed border-border pt-6">
              {author.bio?.length ? (
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
                        rel={EXTERNAL_LINK_REL}
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
