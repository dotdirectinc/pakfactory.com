import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@pakfactory/ui/components/card";
import { cn } from "@pakfactory/ui/lib/utils";

export type CaseStudyCardProps = {
  title: string;
  href: string;
  clientName?: string | null;
  industry?: string | null;
  excerpt?: string | null;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  className?: string;
};

export function CaseStudyCard({
  title,
  href,
  clientName,
  industry,
  excerpt,
  heroImageUrl,
  heroImageAlt,
  className,
}: CaseStudyCardProps) {
  return (
    <a
      href={href}
      className={cn(
        "group block transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Card className="h-full flex flex-col overflow-hidden">
        {heroImageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt={heroImageAlt ?? title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <CardHeader className="gap-1 pb-0">
          {industry && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {industry}
            </p>
          )}
          <h2 className="text-lg font-semibold leading-snug group-hover:underline">
            {title}
          </h2>
          {clientName && (
            <p className="text-sm text-muted-foreground">{clientName}</p>
          )}
        </CardHeader>
        {excerpt && (
          <CardContent className="pt-2">
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {excerpt}
            </p>
          </CardContent>
        )}
      </Card>
    </a>
  );
}
