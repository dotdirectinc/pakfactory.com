import { Button } from "@pakfactory/ui/components/button";
import { EXTERNAL_LINK_REL } from "../lib/external-link";

export type FooterLink = { label: string; href: string; external?: boolean };
export type FooterSection = { title: string; links: FooterLink[] };
export type FooterColumns = FooterSection[][];

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "youtube" | "pinterest" | "x";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  pinterest: "Pinterest",
  x: "X (Twitter)",
};

const PLATFORM_ICON_SRC: Record<SocialPlatform, string> = {
  instagram: "/logos/social/instagram.svg",
  facebook: "/logos/social/facebook.svg",
  linkedin: "/logos/social/linkedin.svg",
  youtube: "/logos/social/youtube.svg",
  pinterest: "/logos/social/pinterest.svg",
  x: "/logos/social/x.svg",
};

type SiteFooterProps = {
  columns: FooterColumns;
  contactHref: string;
  social?: SocialLink[];
};

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "block text-base font-normal leading-6 text-muted-foreground transition-colors hover:text-foreground";
  if (link.external) {
    return <a href={link.href} className={className} target="_blank" rel={EXTERNAL_LINK_REL}>{link.label}</a>;
  }
  return <a href={link.href} className={className}>{link.label}</a>;
}

function FooterSectionBlock({ section }: { section: FooterSection }) {
  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-3">
      <p className="pb-2 text-lg font-medium leading-7 text-foreground">{section.title}</p>
      <ul className="flex flex-col gap-3">
        {section.links.map((link) => (
          <li key={link.label}>
            <FooterLinkItem link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ columns, contactHref, social = [] }: SiteFooterProps) {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-[var(--layout-max)] px-0">
        <div className="border-dashed border-border px-8 py-10 text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Let&apos;s collaborate and craft <br /> your vision
          </h2>
          <Button
            className="mt-6 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <a href={contactHref}>Let&apos;s talk</a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-0 border-t border-dashed border-border md:grid-cols-3">
          {columns.map((column, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col gap-16 border-dashed border-border px-8 py-16 md:border-r md:last:border-r-0"
            >
              {column.map((section) => (
                <FooterSectionBlock key={section.title} section={section} />
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
            <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
              © 2026 PakFactory
            </p>
            {social.length > 0 && (
              <div className="flex items-center gap-6 text-foreground">
                {social.map((link) => {
                  const src = PLATFORM_ICON_SRC[link.platform];
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      aria-label={PLATFORM_LABELS[link.platform]}
                      target="_blank"
                      rel={EXTERNAL_LINK_REL}
                      className="hover:opacity-80"
                    >
                      {src ? (
                        <img src={src} alt="" width={20} height={20} className="size-5" aria-hidden />
                      ) : (
                        <span className="text-sm">{PLATFORM_LABELS[link.platform]}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
