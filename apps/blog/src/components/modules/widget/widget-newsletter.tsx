"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import {
  PageDielineFullBleedSection,
  pageDielineOuterClass,
} from "@/components/layout/page-dieline-section";

const DEFAULT_HEADING = "Get the latest packaging digest";
const DEFAULT_BODY = "Subscribe now for latest packaging news, trends and more.";

type WidgetNewsletterProps = {
  /** Optional overrides; fall back to the defaults above. */
  heading?: string;
  body?: string;
};

/**
 * Newsletter capture widget (PROD-1951, Figma `cta-section-02`). Lives under the
 * widget module so it can be reused across pages (and later promoted to a
 * `contentWidget` type). Submits to `/api/newsletter`; heading/body are optional.
 * Mirrors the `ctaNewsletter` block's UX without depending on the block registry.
 */
export function WidgetNewsletter({ heading, body }: WidgetNewsletterProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [company, setCompany] = useState(""); // honeypot — real users leave empty

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "Something went wrong. Try again later.");
        return;
      }
      toast.success(data.message ?? "Thanks — you're on the list.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Full-bleed rows break out of the page gutter — provide that gutter so
    // negative margins cancel instead of overflowing the viewport.
    <div className={pageDielineOuterClass()}>
      <PageDielineFullBleedSection
        aria-labelledby="widget-newsletter-heading"
        sectionClassName="overflow-x-hidden bg-brand-cream"
        innerClassName="py-10 sm:py-12"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="flex flex-col gap-4">
            <h2
              id="widget-newsletter-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {heading ?? DEFAULT_HEADING}
            </h2>
            <p className="max-w-md text-lg text-muted-foreground">
              {body ?? DEFAULT_BODY}
            </p>
          </div>
          <form onSubmit={onSubmit} className="w-full max-w-lg shrink-0 lg:ml-auto">
            {/* Honeypot — hidden from users; bots fill it and get silently dropped. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="sr-only"
            />
            <div className="flex h-14 items-center rounded-full border border-border bg-white/40 p-1">
              <label htmlFor="widget-newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="widget-newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-full min-h-0 flex-1 rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="h-full shrink-0 rounded-full px-6"
              >
                {isLoading ? "Signing up…" : "Sign Up"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              By subscribing you agree to receive the packaging digest and accept
              our{" "}
              <Link
                href="/privacy-policy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
      </PageDielineFullBleedSection>
    </div>
  );
}
