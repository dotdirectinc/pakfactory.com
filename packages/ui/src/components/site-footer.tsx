import type { ReactNode } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";

export type SiteFooterLink = { label: string; href: string; external?: boolean };
export type SiteFooterSection = { title: string; links: SiteFooterLink[] };
/** One array of sections per column (left → right). */
export type SiteFooterColumns = SiteFooterSection[][];

export type SiteFooterSocialLink = {
  platform:
    | "facebook"
    | "instagram"
    | "x"
    | "linkedin"
    | "youtube"
    | "pinterest";
  url: string;
};

export type SiteFooterAiLink = {
  /** Display name, e.g. "ChatGPT". Used in aria-label. */
  label: string;
  /** Deep-link URL to an AI query about PakFactory. */
  url: string;
  /** Path to icon image in the consumer's public folder, e.g. "/logos/ai/openai.svg". */
  iconSrc: string;
};

export type SiteFooterProps = {
  columns: SiteFooterColumns;
  contactHref: string;
  /**
   * Optional wordmark slot at the top of the footer.
   * Pass a GSAP-animated <FooterWordmark /> or omit for the static fallback.
   */
  wordmark?: ReactNode;
  /** Social platform links rendered in the copyright bar. Omit to hide the icon row. */
  social?: SiteFooterSocialLink[];
  /** AI engine links rendered in the second bottom bar. Omit to hide it. */
  aiLinks?: SiteFooterAiLink[];
};

const PLATFORM_LABELS: Record<SiteFooterSocialLink["platform"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  pinterest: "Pinterest",
};

function SocialIcon({ platform }: { platform: SiteFooterSocialLink["platform"] }) {
  switch (platform) {
    case "facebook":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case "x":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "youtube":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
        </svg>
      );
    case "pinterest":
      return (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.428 1.808-2.428.852 0 1.266.64 1.266 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.476 1.806 1.771 0 2.969-2.29 2.969-4.993 0-2.061-1.399-3.604-3.912-3.604-2.852 0-4.634 2.128-4.634 4.498 0 .817.241 1.392.619 1.839.173.205.197.287.134.524-.045.172-.145.589-.187.755-.06.243-.246.33-.451.24C5.5 17.57 4.5 15.6 4.5 13.2c0-3.36 2.85-7.4 8.5-7.4 4.574 0 7.5 3.34 7.5 6.928 0 4.77-2.77 8.272-6.867 8.272-1.38 0-2.681-.744-3.126-1.578l-.874 3.36c-.316 1.16-1.168 2.614-1.74 3.498.55.162 1.128.249 1.727.249 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      );
    default:
      return null;
  }
}

function FooterLinkItem({ link }: { link: SiteFooterLink }) {
  const className =
    "block text-base font-normal leading-6 text-muted-foreground transition-colors hover:text-foreground";
  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }
  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

function FooterSectionBlock({ section }: { section: SiteFooterSection }) {
  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-3">
      <p className="pb-2 text-lg font-medium leading-7 text-foreground">
        {section.title}
      </p>
      <ul className="flex flex-col gap-3">
        {section.links.map((link) => (
          <li key={`${section.title}-${link.label}`}>
            <FooterLinkItem link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaticWordmark() {
  return (
    <div className="flex justify-center overflow-hidden px-8 py-7">
      <p className="select-none text-center text-[clamp(3rem,12vw,9.5rem)] font-bold leading-none tracking-tight text-primary/35">
        PAKFACTORY
      </p>
    </div>
  );
}

export function SiteFooter({
  columns,
  contactHref,
  wordmark,
  social = [],
  aiLinks = [],
}: SiteFooterProps) {
  return (
    <footer className="bg-background">
      <PageDielineSection innerClassName="px-0">
        {/* Wordmark */}
        {wordmark ?? <StaticWordmark />}

        {/* Collaboration CTA */}
        <div className="border-t border-dashed border-border px-8 py-10 text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Let&apos;s collaborate
            <br />
            and craft your vision
          </h2>
          <Button
            className="mt-6 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <a href={contactHref}>
              Let&apos;s talk
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-background text-primary">
                <MessageSquareText className="size-3" strokeWidth={2} />
              </span>
            </a>
          </Button>
        </div>

        {/* Link columns */}
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

        {/* Bottom bar — copyright + social icons */}
        <div className="border-t border-dashed border-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
            <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
              © 2026 PakFactory
            </p>
            {social.length > 0 && (
              <div className="flex items-center gap-8 text-foreground">
                {social.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    aria-label={PLATFORM_LABELS[link.platform] ?? link.platform}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:opacity-80"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar — AI answer links (optional) */}
        {aiLinks.length > 0 && (
          <div className="border-t border-dashed border-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
              <div className="flex flex-wrap items-center gap-6">
                <p className="text-sm text-muted-foreground">
                  See what AI says about PakFactory
                </p>
                <div className="flex h-4 items-center gap-3">
                  {aiLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      aria-label={`Ask ${link.label} about PakFactory`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={link.iconSrc}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4"
                        aria-hidden
                      />
                    </a>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2026 PakFactory. All Rights Reserved
              </p>
            </div>
          </div>
        )}
      </PageDielineSection>
    </footer>
  );
}
