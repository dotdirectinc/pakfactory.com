"use client";

import Image from "next/image";
import { useState } from "react";
import { EXTERNAL_LINK_REL } from "@/lib/external-link";

type PostAskAiProps = {
  url: string;
  title: string;
};

/**
 * "Ask AI about this article" — deep-links each assistant with a pre-filled
 * prompt referencing the article URL. ChatGPT / Perplexity / Claude / Grok
 * prefill natively via `?q=`; Gemini has no URL prefill, so its icon copies the
 * prompt to the clipboard and opens Gemini for the user to paste.
 */
const PROVIDERS = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "/logos/ai/openai.svg",
    build: (q: string) => `https://chatgpt.com/?q=${q}`,
    prefill: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: "/logos/ai/gemini.svg",
    build: (q: string) => `https://gemini.google.com/app?q=${q}`,
    prefill: false,
  },
  {
    id: "perplexity",
    label: "Perplexity",
    icon: "/logos/ai/perplexity.svg",
    build: (q: string) => `https://www.perplexity.ai/search?q=${q}`,
    prefill: true,
  },
  {
    id: "claude",
    label: "Claude",
    icon: "/logos/ai/claude.svg",
    build: (q: string) => `https://claude.ai/new?q=${q}`,
    prefill: true,
  },
  {
    id: "grok",
    label: "Grok",
    icon: "/logos/ai/grok.svg",
    build: (q: string) => `https://grok.com/?q=${q}`,
    prefill: true,
  },
] as const;

export function PostAskAi({ url, title }: PostAskAiProps) {
  const [copied, setCopied] = useState(false);
  const promptText = `Summarize the key takeaways from this article "${title}": ${url}`;
  const q = encodeURIComponent(promptText);

  async function copyPromptThenOpen(href: string) {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard may be unavailable — still open Gemini.
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium text-muted-foreground">
        Ask AI about this article
      </p>
      <div className="flex w-full items-center justify-between">
        {PROVIDERS.map((provider) => {
          const href = provider.build(q);
          return (
            <a
              key={provider.id}
              href={href}
              target="_blank"
              rel={EXTERNAL_LINK_REL}
              onClick={
                provider.prefill
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      void copyPromptThenOpen(href);
                    }
              }
              aria-label={
                provider.prefill
                  ? `Ask ${provider.label} about this article`
                  : `Copy the prompt and open ${provider.label}`
              }
              className="flex rounded-sm outline-none transition-opacity hover:opacity-70 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Image
                src={provider.icon}
                alt=""
                width={20}
                height={20}
                className="size-5"
                aria-hidden
              />
            </a>
          );
        })}
      </div>
      {copied ? (
        <p role="status" className="text-xs text-muted-foreground">
          Prompt copied — paste it into Gemini.
        </p>
      ) : null}
    </div>
  );
}
