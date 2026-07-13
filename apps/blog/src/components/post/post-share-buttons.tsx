"use client";

import Image from "next/image";
import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { EXTERNAL_LINK_REL } from "@/lib/external-link";

type PostShareButtonsProps = {
  url: string;
  title: string;
};

const NETWORKS = [
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    icon: "/logos/social/linkedin.svg",
    href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  {
    id: "x",
    label: "Share on X",
    icon: "/logos/social/x.svg",
    href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  },
  {
    id: "facebook",
    label: "Share on Facebook",
    icon: "/logos/social/facebook.svg",
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

  // Instagram has no web "share URL" dialog. On mobile use the native share
  // sheet (Instagram appears there); on desktop fall back to copying the link.
  async function shareInstagram() {
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    if (canNativeShare) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User dismissed the share sheet
      }
      return;
    }
    await copyLink();
  }

  const iconLink =
    "flex size-5 items-center justify-center rounded-sm text-foreground outline-none transition-opacity hover:opacity-70 focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium text-muted-foreground">Share article</p>
      <div className="flex items-center justify-start gap-5">
        <button
          type="button"
          onClick={copyLink}
          aria-label={copied ? "Link copied" : "Copy link"}
          className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check className="size-5" aria-hidden />
          ) : (
            <Link2 className="size-5" aria-hidden />
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
            <Image
              src={network.icon}
              alt=""
              width={20}
              height={20}
              className="size-5"
              aria-hidden
            />
          </a>
        ))}
        <button
          type="button"
          onClick={shareInstagram}
          aria-label="Share on Instagram"
          className="flex size-5 cursor-pointer items-center justify-center rounded-sm outline-none transition-opacity hover:opacity-70 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Image
            src="/logos/social/instagram.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
            aria-hidden
          />
        </button>
      </div>
      {copied ? (
        <p role="status" className="text-xs text-muted-foreground">
          Link copied to clipboard.
        </p>
      ) : null}
    </div>
  );
}
