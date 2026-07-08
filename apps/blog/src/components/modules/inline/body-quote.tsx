import type { PostBodyQuote } from "@/lib/blog-post";

type BodyQuoteProps = {
  value: PostBodyQuote;
};

/** Inline pull-quote block authored in the post body portable text. */
export function BodyQuote({ value }: BodyQuoteProps) {
  const quote = value.quote?.trim();
  if (!quote) return null;

  const attribution = value.attribution?.trim();

  return (
    <figure className="my-8">
      <div className="flex items-start gap-4">
        <blockquote className="flex-1 text-2xl font-light leading-snug text-foreground sm:text-3xl">
          {quote}
        </blockquote>
        <span
          aria-hidden="true"
          className="shrink-0 select-none font-serif text-6xl leading-none text-muted-foreground/30"
        >
          &rdquo;
        </span>
      </div>
      {attribution ? (
        <figcaption className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {`— ${attribution}`}
        </figcaption>
      ) : null}
    </figure>
  );
}
