"use client";

import { useState } from "react";
import { Link2, Linkedin, Facebook } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

// X keeps its brand mark; LinkedIn/Facebook use lucide (shadcn's icon library).
function TwitterXIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

type Props = {
  url: string;
  title: string;
  className?: string;
  showCta?: boolean;
  ctaHeading?: string | null;
  primaryLabel?: string | null;
  primaryHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
};

export function CaseStudyShare({
  url,
  title,
  className,
  showCta = false,
  ctaHeading,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className={cn("flex w-full flex-col gap-[42px]", className)}>
      <div className="flex w-full flex-col gap-4">
        <p className="text-base font-medium text-muted-foreground">Share article</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={copied ? "Copied!" : "Copy link"}
            onClick={handleCopyLink}
            className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link2 className="size-4" strokeWidth={1.75} />
          </button>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on LinkedIn"
            className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Linkedin className="size-4" strokeWidth={1.75} />
          </a>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X (Twitter)"
            className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <TwitterXIcon className="size-4" />
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
            className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Facebook className="size-4" strokeWidth={1.75} />
          </a>
        </div>
      </div>

      {showCta && (
        <>
          <p className="w-full text-lg font-medium leading-7 text-foreground">
            {ctaHeading ?? "Ready to build packaging your customers remember?"}
          </p>
          <div className="flex w-full flex-col gap-5">
            <a
              href={primaryHref ?? "/contact"}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-medium leading-6 text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              {primaryLabel ?? "Contact Sales"}
            </a>
            <a
              href={secondaryHref ?? "/solutions"}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background px-6 text-base font-medium leading-6 text-foreground shadow-xs transition-colors hover:bg-muted"
            >
              {secondaryLabel ?? "Explore Solutions"}
            </a>
          </div>
        </>
      )}
    </div>
  );
}
