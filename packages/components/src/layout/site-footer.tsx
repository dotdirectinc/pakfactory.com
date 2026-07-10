import { Button } from "@pakfactory/ui/components/button";
import { PageDielineSection } from "@pakfactory/ui/components/page-dieline-section";
import { EXTERNAL_LINK_REL, externalLinkAttributes } from "../commons/external-link";

export type FooterLink = { label: string; href: string; external?: boolean };
export type FooterSection = { title: string; links: FooterLink[] };
export type FooterColumns = FooterSection[][];

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "youtube" | "pinterest" | "x";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

export type AiEngine = "chatgpt" | "gemini" | "perplexity" | "claude" | "grok";

export type AiLink = {
  engine: AiEngine;
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

const AI_ICON_SRC: Record<AiEngine, string> = {
  chatgpt: "/logos/ai/openai.svg",
  gemini: "/logos/ai/gemini.svg",
  perplexity: "/logos/ai/perplexity.svg",
  claude: "/logos/ai/claude.svg",
  grok: "/logos/ai/grok.svg",
};

const AI_LABELS: Record<AiEngine, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  grok: "Grok",
};

// ─── Inline social SVG icons ──────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M10 1.80078C12.6719 1.80078 12.9883 1.8125 14.0391 1.85937C15.0156 1.90234 15.543 2.06641 15.8945 2.20313C16.3594 2.38281 16.6953 2.60156 17.043 2.94922C17.3945 3.30078 17.6094 3.63281 17.7891 4.09766C17.9258 4.44922 18.0898 4.98047 18.1328 5.95313C18.1797 7.00781 18.1914 7.32422 18.1914 9.99219C18.1914 12.6641 18.1797 12.9805 18.1328 14.0313C18.0898 15.0078 17.9258 15.5352 17.7891 15.8867C17.6094 16.3516 17.3906 16.6875 17.043 17.0352C16.6914 17.3867 16.3594 17.6016 15.8945 17.7813C15.543 17.918 15.0117 18.082 14.0391 18.125C12.9844 18.1719 12.668 18.1836 10 18.1836C7.32813 18.1836 7.01172 18.1719 5.96094 18.125C4.98438 18.082 4.45703 17.918 4.10547 17.7813C3.64063 17.6016 3.30469 17.3828 2.95703 17.0352C2.60547 16.6836 2.39063 16.3516 2.21094 15.8867C2.07422 15.5352 1.91016 15.0039 1.86719 14.0313C1.82031 12.9766 1.80859 12.6602 1.80859 9.99219C1.80859 7.32031 1.82031 7.00391 1.86719 5.95313C1.91016 4.97656 2.07422 4.44922 2.21094 4.09766C2.39063 3.63281 2.60938 3.29688 2.95703 2.94922C3.30859 2.59766 3.64063 2.38281 4.10547 2.20313C4.45703 2.06641 4.98828 1.90234 5.96094 1.85937C7.01172 1.8125 7.32813 1.80078 10 1.80078ZM10 0C7.28516 0 6.94531 0.0117187 5.87891 0.0585938C4.81641 0.105469 4.08594 0.277344 3.45313 0.523437C2.79297 0.78125 2.23438 1.12109 1.67969 1.67969C1.12109 2.23438 0.78125 2.79297 0.523438 3.44922C0.277344 4.08594 0.105469 4.8125 0.0585938 5.875C0.0117188 6.94531 0 7.28516 0 10C0 12.7148 0.0117188 13.0547 0.0585938 14.1211C0.105469 15.1836 0.277344 15.9141 0.523438 16.5469C0.78125 17.207 1.12109 17.7656 1.67969 18.3203C2.23438 18.875 2.79297 19.2188 3.44922 19.4727C4.08594 19.7188 4.8125 19.8906 5.875 19.9375C6.94141 19.9844 7.28125 19.9961 9.99609 19.9961C12.7109 19.9961 13.0508 19.9844 14.1172 19.9375C15.1797 19.8906 15.9102 19.7188 16.543 19.4727C17.1992 19.2188 17.7578 18.875 18.3125 18.3203C18.8672 17.7656 19.2109 17.207 19.4648 16.5508C19.7109 15.9141 19.8828 15.1875 19.9297 14.125C19.9766 13.0586 19.9883 12.7188 19.9883 10.0039C19.9883 7.28906 19.9766 6.94922 19.9297 5.88281C19.8828 4.82031 19.7109 4.08984 19.4648 3.45703C19.2188 2.79297 18.8789 2.23438 18.3203 1.67969C17.7656 1.125 17.207 0.78125 16.5508 0.527344C15.9141 0.28125 15.1875 0.109375 14.125 0.0625C13.0547 0.0117188 12.7148 0 10 0Z" fill="currentColor"/>
      <path d="M10 4.86328C7.16406 4.86328 4.86328 7.16406 4.86328 10C4.86328 12.8359 7.16406 15.1367 10 15.1367C12.8359 15.1367 15.1367 12.8359 15.1367 10C15.1367 7.16406 12.8359 4.86328 10 4.86328ZM10 13.332C8.16016 13.332 6.66797 11.8398 6.66797 10C6.66797 8.16016 8.16016 6.66797 10 6.66797C11.8398 6.66797 13.332 8.16016 13.332 10C13.332 11.8398 11.8398 13.332 10 13.332Z" fill="currentColor"/>
      <path d="M16.5391 4.66012C16.5391 5.32418 16 5.85934 15.3398 5.85934C14.6758 5.85934 14.1406 5.32028 14.1406 4.66012C14.1406 3.99606 14.6797 3.4609 15.3398 3.4609C16 3.4609 16.5391 3.99996 16.5391 4.66012Z" fill="currentColor"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M10 0C4.4772 0 0 4.4772 0 10C0 14.6896 3.2288 18.6248 7.5844 19.7056V13.056H5.5224V10H7.5844V8.6832C7.5844 5.2796 9.1248 3.702 12.4664 3.702C13.1 3.702 14.1932 3.8264 14.6404 3.9504V6.7204C14.4044 6.6956 13.9944 6.6832 13.4852 6.6832C11.8456 6.6832 11.212 7.3044 11.212 8.9192V10H14.4784L13.9172 13.056H11.212V19.9268C16.1636 19.3288 20.0004 15.1128 20.0004 10C20 4.4772 15.5228 0 10 0Z" fill="currentColor"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M18.5195 0H1.47656C0.660156 0 0 0.644531 0 1.44141V18.5547C0 19.3516 0.660156 20 1.47656 20H18.5195C19.3359 20 20 19.3516 20 18.5586V1.44141C20 0.644531 19.3359 0 18.5195 0ZM5.93359 17.043H2.96484V7.49609H5.93359V17.043ZM4.44922 6.19531C3.49609 6.19531 2.72656 5.42578 2.72656 4.47656C2.72656 3.52734 3.49609 2.75781 4.44922 2.75781C5.39844 2.75781 6.16797 3.52734 6.16797 4.47656C6.16797 5.42187 5.39844 6.19531 4.44922 6.19531ZM17.043 17.043H14.0781V12.4023C14.0781 11.2969 14.0586 9.87109 12.5352 9.87109C10.9922 9.87109 10.7578 11.0781 10.7578 12.3242V17.043H7.79688V7.49609H10.6406V8.80078H10.6797C11.0742 8.05078 12.043 7.25781 13.4844 7.25781C16.4883 7.25781 17.043 9.23438 17.043 11.8047V17.043V17.043Z" fill="currentColor"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M19.8008 6.00004C19.8008 6.00004 19.6055 4.62113 19.0039 4.01566C18.2422 3.21879 17.3906 3.21488 17 3.16801C14.2031 2.96488 10.0039 2.96488 10.0039 2.96488H9.99609C9.99609 2.96488 5.79687 2.96488 3 3.16801C2.60938 3.21488 1.75781 3.21879 0.996094 4.01566C0.394531 4.62113 0.203125 6.00004 0.203125 6.00004C0.203125 6.00004 0 7.62113 0 9.23832V10.7539C0 12.3711 0.199219 13.9922 0.199219 13.9922C0.199219 13.9922 0.394531 15.3711 0.992187 15.9766C1.75391 16.7735 2.75391 16.7461 3.19922 16.8321C4.80078 16.9844 10 17.0313 10 17.0313C10 17.0313 14.2031 17.0235 17 16.8243C17.3906 16.7774 18.2422 16.7735 19.0039 15.9766C19.6055 15.3711 19.8008 13.9922 19.8008 13.9922C19.8008 13.9922 20 12.375 20 10.7539V9.23832C20 7.62113 19.8008 6.00004 19.8008 6.00004ZM7.93359 12.5938V6.97269L13.3359 9.79301L7.93359 12.5938Z" fill="currentColor"/>
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M10 0C4.47656 0 0 4.47656 0 10C0 14.2383 2.63672 17.8555 6.35547 19.3125C6.26953 18.5195 6.1875 17.3086 6.39063 16.4453C6.57422 15.6641 7.5625 11.4766 7.5625 11.4766C7.5625 11.4766 7.26172 10.8789 7.26172 9.99219C7.26172 8.60156 8.06641 7.5625 9.07031 7.5625C9.92187 7.5625 10.3359 8.20312 10.3359 8.97266C10.3359 9.83203 9.78906 11.1133 9.50781 12.3008C9.27344 13.2969 10.0078 14.1094 10.9883 14.1094C12.7656 14.1094 14.1328 12.2344 14.1328 9.53125C14.1328 7.13672 12.4141 5.46094 9.95703 5.46094C7.11328 5.46094 5.44141 7.59375 5.44141 9.80078C5.44141 10.6602 5.77344 11.582 6.1875 12.082C6.26953 12.1797 6.28125 12.2695 6.25781 12.3672C6.18359 12.6836 6.01172 13.3633 5.98047 13.5C5.9375 13.6836 5.83594 13.7227 5.64453 13.6328C4.39453 13.0508 3.61328 11.2266 3.61328 9.75781C3.61328 6.60156 5.90625 3.70703 10.2188 3.70703C13.6875 3.70703 16.3828 6.17969 16.3828 9.48438C16.3828 12.9297 14.2109 15.7031 11.1953 15.7031C10.1836 15.7031 9.23047 15.1758 8.90234 14.5547C8.90234 14.5547 8.40234 16.4648 8.28125 16.9336C8.05469 17.8008 7.44531 18.8906 7.03906 19.5547C7.97656 19.8438 8.96875 20 10 20C15.5234 20 20 15.5234 20 10C20 4.47656 15.5234 0 10 0Z" fill="currentColor"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

const PLATFORM_ICONS: Record<SocialPlatform, () => React.ReactElement> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  x: XIcon,
};

// ─── Component ────────────────────────────────────────────────────────────────

type SiteFooterProps = {
  columns: FooterColumns;
  contactHref: string;
  contactLabel?: string;
  social?: SocialLink[];
  aiLinks?: AiLink[];
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

export function SiteFooter({
  columns,
  contactHref,
  contactLabel = "Let's talk",
  social = [],
  aiLinks = [],
}: SiteFooterProps) {
  return (
    <footer className="bg-background">
      <PageDielineSection innerClassName="px-0">
        <div className="border-t border-dashed border-foreground/10 px-8 py-16 text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Let&apos;s collaborate and craft <br /> your vision
          </h2>
          <Button
            className="mt-6 h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <a href={contactHref} {...externalLinkAttributes(contactHref)}>
              {contactLabel}
            </a>
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

        {/* Bottom row 1 — copyright + social icons */}
        <div className="border-t border-dashed border-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
            <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
              © 2026 PakFactory
            </p>
            {social.length > 0 && (
              <div className="flex items-center gap-5 text-foreground">
                {social.map((link) => {
                  const Icon = PLATFORM_ICONS[link.platform];
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      aria-label={PLATFORM_LABELS[link.platform]}
                      target="_blank"
                      rel={EXTERNAL_LINK_REL}
                      className="hover:opacity-80"
                    >
                      {Icon ? <Icon /> : <span className="text-sm">{PLATFORM_LABELS[link.platform]}</span>}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row 2 — AI answer links + full rights */}
        <div className="border-t border-dashed border-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
            <div className="flex flex-wrap items-center gap-6">
              <p className="text-sm text-muted-foreground">See what AI says about PakFactory</p>
              {aiLinks.length > 0 && (
                <div className="flex h-4 items-center gap-3">
                  {aiLinks.map((link) => {
                    const src = AI_ICON_SRC[link.engine];
                    if (!src) return null;
                    return (
                      <a
                        key={link.engine}
                        href={link.url}
                        aria-label={`Ask ${AI_LABELS[link.engine]} about PakFactory`}
                        target="_blank"
                        rel={EXTERNAL_LINK_REL}
                        className="hover:opacity-80"
                      >
                        <img src={src} alt="" width={16} height={16} className="size-4" aria-hidden />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">© 2026 PakFactory. All Rights Reserved</p>
          </div>
        </div>
      </PageDielineSection>
    </footer>
  );
}
