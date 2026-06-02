import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";

const DEFAULT_QUOTE_HREF = "https://www.pakfactory.com/contact";

function quoteHref(): string {
  const www = process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, "");
  if (www) return `${www}/contact`;
  return DEFAULT_QUOTE_HREF;
}

type RfqCtaProps = {
  className?: string;
};

export function RfqCta({ className }: RfqCtaProps) {
  return (
    <section
      className={className}
      aria-labelledby="global-rfq-heading"
    >
      <Card className="bg-muted/30 text-center">
        <CardHeader className="items-center text-center">
          <CardTitle id="global-rfq-heading" className="text-xl">
            Need custom packaging?
          </CardTitle>
          <CardDescription className="mx-auto max-w-md">
            Talk to PakFactory packaging experts for quotes, specs, and production guidance.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center pt-0">
          <Button asChild>
            <Link href={quoteHref()}>Get a quote</Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
