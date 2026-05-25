import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";

function wwwOrigin(): string {
  const www = process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, "");
  return www || "https://www.pakfactory.com";
}

function pillars() {
  const www = wwwOrigin();
  return [
    {
      title: "PakFactory",
      description:
        "Custom packaging programs — structural design, sourcing, and production at scale.",
      href: www,
      cta: "Explore capabilities",
    },
    {
      title: "Resources",
      description:
        "Guides, specs, and tools to move from brief to production-ready packaging.",
      href: `${www}/resources`,
      cta: "Browse resources",
    },
    {
      title: "Case Studies",
      description:
        "See how brands solved launch, sustainability, and unboxing challenges with PakFactory.",
      href: `${www}/case-studies`,
      cta: "Read case studies",
    },
  ] as const;
}

export function HomeConversionPillars() {
  const PILLARS = pillars();
  return (
    <section className="py-10" aria-labelledby="conversion-pillars-heading">
      <h2 id="conversion-pillars-heading" className="sr-only">
        Explore PakFactory
      </h2>
      <ul className="grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <li key={pillar.title}>
            <Card className="h-full bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={pillar.href}>{pillar.cta} →</Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
