import type { CSSProperties } from "react";
import { Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
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

// ─── Social icons — lucide (outline) + custom X logo & Pinterest ──────────────
// Instagram/Facebook/LinkedIn/YouTube come from lucide (shadcn's icon library).
// X keeps its brand mark; Pinterest has no lucide icon so it's a matching outline SVG.

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// Pinterest has no lucide icon — filled brand "P" mark (matches the POC footer).
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026z" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  pinterest: PinterestIcon,
  x: XIcon,
};

// Fixed display order (matches the POC footer): Facebook → Instagram → LinkedIn → YouTube → Pinterest, X last.
const PLATFORM_ORDER: SocialPlatform[] = ["facebook", "instagram", "linkedin", "youtube", "pinterest", "x"];

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
    <div className="flex min-w-[200px] flex-col gap-3">
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
  const sectionRows = Math.max(1, ...columns.map((column) => column.length));
  const orderedSocial = [...social].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform),
  );

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

        <div
          className="grid grid-cols-1 gap-16 border-t border-dashed border-border px-8 py-16 md:grid-cols-3 md:gap-x-0 md:gap-y-16 md:px-0 md:py-0 md:[grid-template-rows:repeat(var(--footer-section-rows),auto)]"
          style={
            {
              "--footer-section-rows": sectionRows,
            } as CSSProperties
          }
        >
          {columns.map((column, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col gap-16 border-dashed border-border md:grid md:grid-rows-subgrid md:gap-y-16 md:border-r md:px-8 md:py-16 md:last:border-r-0 md:[grid-row:span_var(--footer-section-rows)]"
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
            {orderedSocial.length > 0 && (
              <div className="flex items-center gap-2.5">
                {orderedSocial.map((link) => {
                  const Icon = PLATFORM_ICONS[link.platform];
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      aria-label={PLATFORM_LABELS[link.platform]}
                      target="_blank"
                      rel={EXTERNAL_LINK_REL}
                      className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
                    >
                      {Icon ? <Icon className="size-4" /> : <span className="text-sm">{PLATFORM_LABELS[link.platform]}</span>}
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
