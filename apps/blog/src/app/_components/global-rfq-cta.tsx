import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";

const DEFAULT_QUOTE_HREF = "https://www.pakfactory.com/contact";

function quoteHref(): string {
  const www = process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, "");
  if (www) return `${www}/contact`;
  return DEFAULT_QUOTE_HREF;
}

type GlobalRfqCtaProps = {
  className?: string;
};

export function GlobalRfqCta({ className }: GlobalRfqCtaProps) {
  return (
    <section
      className={className}
      aria-labelledby="global-rfq-heading"
    >
      <div className="rounded-lg border bg-muted/30 px-6 py-8 text-center">
        <h2 id="global-rfq-heading" className="text-xl font-semibold tracking-tight">
          Need custom packaging?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Talk to PakFactory packaging experts for quotes, specs, and production guidance.
        </p>
        <Button asChild className="mt-4">
          <Link href={quoteHref()}>Get a quote</Link>
        </Button>
      </div>
    </section>
  );
}
