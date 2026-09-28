import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@pakfactory/ui/lib/utils";

export type AuthSplitLayoutProps = {
  logo: ReactNode;
  homeHref: string;
  testimonial?: {
    quote: string;
    attribution: string;
    variant?: "default" | "primary";
  };
  children: ReactNode;
};

export function AuthSplitLayout({
  logo,
  homeHref,
  testimonial,
  children,
}: AuthSplitLayoutProps) {
  const testimonialVariant = testimonial?.variant ?? "default";
  const isPrimary = testimonialVariant === "primary";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-4 sm:px-6 sm:py-6">
        <Link href={homeHref} aria-label="Home" className="w-fit">
          {logo}
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
      </div>

      {testimonial ? (
        <aside
          className={cn(
            "hidden items-center justify-center px-12 py-16 lg:flex",
            isPrimary ? "bg-primary" : "bg-muted/40",
          )}
          aria-label={isPrimary ? "Team message" : "Customer testimonial"}
        >
          <figure className="max-w-md">
            <blockquote
              className={cn(
                "text-xl font-medium tracking-tight",
                isPrimary ? "text-primary-foreground" : "text-foreground",
              )}
            >
              <span
                className={cn(
                  "mb-6 block text-5xl leading-none",
                  isPrimary
                    ? "text-primary-foreground/50"
                    : "text-muted-foreground/50",
                )}
                aria-hidden="true"
              >
                &ldquo;
              </span>
              {testimonial.quote}
            </blockquote>
            <figcaption
              className={cn(
                "mt-8 text-sm",
                isPrimary
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {testimonial.attribution}
            </figcaption>
          </figure>
        </aside>
      ) : null}
    </div>
  );
}
