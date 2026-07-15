"use client";

import { Check, Link } from "lucide-react";
import { useState } from "react";
import { SocialPlatformIcon } from "@/components/modules/social-platform-icon";
import { EXTERNAL_LINK_REL } from "@/lib/external-link";

type PostShareButtonsProps = {
  url: string;
  title: string;
};

const NETWORKS = [
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  {
    id: "x",
    label: "Share on X",
    href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  },
  {
    id: "facebook",
    label: "Share on Facebook",
    href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  },
] as const;

export function PostShareButtons({ url, title }: PostShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable
    }
  }

  // POC `ShareLink` — round-bordered circle that lifts and tints green on hover.
  const iconLink =
    "flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-[var(--opacity-primary-10)] hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium text-muted-foreground">Share article</p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={copyLink}
          aria-label={copied ? "Link copied" : "Copy link"}
          className={`${iconLink} cursor-pointer`}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Link className="size-4" aria-hidden />
          )}
        </button>
        {NETWORKS.map((network) => (
          <a
            key={network.id}
            href={network.href(encodedUrl, encodedTitle)}
            target="_blank"
            rel={EXTERNAL_LINK_REL}
            aria-label={network.label}
            className={iconLink}
          >
            <SocialPlatformIcon platform={network.id} size={16} />
          </a>
        ))}
      </div>
      {copied ? (
        <p role="status" className="text-xs text-muted-foreground">
          Link copied to clipboard.
        </p>
      ) : null}
    </div>
  );
}
