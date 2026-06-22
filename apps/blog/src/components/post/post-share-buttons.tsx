"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

type PostShareButtonsProps = {
  url: string;
  title: string;
};

function shareHref(network: string, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  switch (network) {
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "email":
      return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
    default:
      return url;
  }
}

export function PostShareButtons({ url, title }: PostShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable
    }
  }

  const networks = [
    { id: "linkedin", label: "Share on LinkedIn" },
    { id: "x", label: "Share on X" },
    { id: "facebook", label: "Share on Facebook" },
    { id: "email", label: "Share by email" },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-foreground">Share article</p>
      <div className="flex flex-wrap items-center gap-4">
        {networks.map((network) => (
          <a
            key={network.id}
            href={shareHref(network.id, url, title)}
            target={network.id === "email" ? undefined : "_blank"}
            rel={network.id === "email" ? undefined : "noopener noreferrer"}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            aria-label={network.label}
          >
            {network.id === "x" ? "X" : network.id.charAt(0).toUpperCase() + network.id.slice(1)}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
