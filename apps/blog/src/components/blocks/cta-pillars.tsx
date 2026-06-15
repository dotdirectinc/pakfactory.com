import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import type { CtaPillarsBlock, BlockProps } from "@/components/blocks/registry";

/**
 * `ctaPillars` page-builder block — a promo band of "pillar" cards linking out
 * to key destinations (capabilities, resources, case studies).
 */
export function CtaPillars({ pillars }: BlockProps<CtaPillarsBlock>) {
  if (!pillars || pillars.length === 0) return null;

  return (
    <section className="py-10" aria-labelledby="cta-pillars-heading">
      <h2 id="cta-pillars-heading" className="sr-only">
        Explore PakFactory
      </h2>
      <ul className="grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <li key={pillar.title}>
            <Card className="h-full bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={pillar.href}>{pillar.ctaLabel} →</Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
