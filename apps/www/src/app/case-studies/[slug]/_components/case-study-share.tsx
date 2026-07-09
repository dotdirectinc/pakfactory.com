"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

type Props = { url: string; title: string };

export function CaseStudyShare({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Share
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on LinkedIn"
          >
            <LinkedInIcon />
            LinkedIn
          </a>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
          >
            <XIcon />X
          </a>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
          >
            <FacebookIcon />
            Facebook
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-full"
          onClick={copyLink}
          aria-label="Copy link"
        >
          {copied ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Link2 className="size-4" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
