"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TwitterXIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.79c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.57V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
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
        <div className="flex items-center gap-4 text-foreground">
          <button
            type="button"
            aria-label={copied ? "Copied!" : "Copy link"}
            onClick={handleCopyLink}
            className="transition-colors hover:text-primary"
          >
            <Link2 className="size-5" strokeWidth={1.75} />
          </button>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on LinkedIn"
            className="transition-colors hover:text-primary"
          >
            <LinkedInIcon className="size-5" />
          </a>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X (Twitter)"
            className="transition-colors hover:text-primary"
          >
            <TwitterXIcon className="size-5" />
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
            className="transition-colors hover:text-primary"
          >
            <FacebookIcon className="size-5" />
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
