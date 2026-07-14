"use client";

import Image from "next/image";
import { Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { EXTERNAL_LINK_REL } from "@/lib/external-link";

type PostAskAiProps = {
  url: string;
  title: string;
};

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

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function PostAskAi({ url, title }: PostAskAiProps) {
  const [copied, setCopied] = useState(false);
  const promptText = `Summarize the key takeaways from this article "${title}": ${url}`;
  const q = encodeURIComponent(promptText);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard may be unavailable
    }
  }

  async function copyPromptThenOpen(href: string) {
    await copyPrompt();
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--opacity-primary-10)] p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
        Ask AI about this article
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        Get a summary or answers from your favorite assistant.
      </p>
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((provider) => {
          const href = provider.build(q);
          if (!provider.prefill) {
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => void copyPromptThenOpen(href)}
                aria-label={`Copy the prompt and open ${provider.label}`}
                className={CHIP_CLASS}
              >
                <Image
                  src={provider.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4"
                  aria-hidden
                />
                {provider.label}
              </button>
            );
          }
          return (
            <a
              key={provider.id}
              href={href}
              target="_blank"
              rel={EXTERNAL_LINK_REL}
              aria-label={`Ask ${provider.label} about this article`}
              className={CHIP_CLASS}
            >
              <Image
                src={provider.icon}
                alt=""
                width={16}
                height={16}
                className="size-4"
                aria-hidden
              />
              {provider.label}
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => void copyPrompt()}
          aria-label="Copy AI prompt to clipboard"
          className={CHIP_CLASS}
        >
          <Copy className="size-3.5" aria-hidden />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
    </div>
  );
}
