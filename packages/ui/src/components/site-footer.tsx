import type { ReactNode } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";

export type SiteFooterLink = { label: string; href: string; external?: boolean };
export type SiteFooterSection = { title: string; links: SiteFooterLink[] };
/** One array of sections per column (left → right). */
export type SiteFooterColumns = SiteFooterSection[][];

export type SiteFooterProps = {
  columns: SiteFooterColumns;
  contactHref: string;
  /**
   * Optional wordmark slot rendered at the top of the footer.
   * The blog passes its GSAP-animated <FooterWordmark />.
   * Omit to render a plain static wordmark.
   */
  wordmark?: ReactNode;
};

function FooterLinkItem({ link }: { link: SiteFooterLink }) {
  const className =
    "block text-base font-normal leading-6 text-muted-foreground transition-colors hover:text-foreground";
  return link.external ? (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  ) : (
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

export function SiteFooter({ columns, contactHref, wordmark }: SiteFooterProps) {
  return (
    <footer className="bg-background">
      <div className="w-full px-4 sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-0">
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

          {/* Bottom bar */}
          <div className="border-t border-dashed border-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-y-3 px-8 py-8">
              <p className="min-w-[200px] flex-1 text-base font-medium text-foreground">
                © 2026 PakFactory
              </p>
              <div className="flex items-center gap-11 text-foreground">
                <a
                  href="https://www.facebook.com/pakfactory"
                  aria-label="Facebook"
                  className="text-foreground hover:opacity-80"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/pakfactory"
                  aria-label="Instagram"
                  className="text-foreground hover:opacity-80"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://x.com/pakfactory"
                  aria-label="X"
                  className="text-foreground hover:opacity-80"
                >
                  <span className="sr-only">X</span>
                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/pakfactory"
                  aria-label="LinkedIn"
                  className="text-foreground hover:opacity-80"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
