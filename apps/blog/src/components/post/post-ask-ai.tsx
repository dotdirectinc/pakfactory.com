import Image from "next/image";

type PostAskAiProps = {
  url: string;
  title: string;
};

/**
 * "Ask AI about this article" — deep-links each assistant with a pre-filled
 * prompt referencing the article URL. Icons reuse the shared /logos/ai assets
 * (same set the footer's Ask-AI row uses).
 */
const PROVIDERS = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "/logos/ai/openai.svg",
    build: (q: string) => `https://chatgpt.com/?q=${q}`,
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: "/logos/ai/gemini.svg",
    build: (q: string) => `https://gemini.google.com/app?q=${q}`,
  },
  {
    id: "perplexity",
    label: "Perplexity",
    icon: "/logos/ai/perplexity.svg",
    build: (q: string) => `https://www.perplexity.ai/search?q=${q}`,
  },
  {
    id: "claude",
    label: "Claude",
    icon: "/logos/ai/claude.svg",
    build: (q: string) => `https://claude.ai/new?q=${q}`,
  },
  {
    id: "grok",
    label: "Grok",
    icon: "/logos/ai/grok.svg",
    build: (q: string) => `https://grok.com/?q=${q}`,
  },
] as const;

export function PostAskAi({ url, title }: PostAskAiProps) {
  const q = encodeURIComponent(
    `Summarize the key takeaways from this article "${title}": ${url}`,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium text-muted-foreground">
        Ask AI about this article
      </p>
      <div className="flex flex-wrap items-center gap-6">
        {PROVIDERS.map((provider) => (
          <a
            key={provider.id}
            href={provider.build(q)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask ${provider.label} about this article`}
            className="transition-opacity hover:opacity-70"
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
        ))}
      </div>
    </div>
  );
}
