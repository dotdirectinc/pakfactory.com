"use client";

import { useState } from "react";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  pageFullBleedRowClass,
  pageFullBleedSectionContentClass,
} from "@/components/common/page-dieline-section";

/**
 * Newsletter capture CTA (PROD-1506). Submits to `/api/newsletter` when configured.
 */
export function CtaNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Something went wrong. Try again later.");
        return;
      }
      setStatus("ok");
      setMessage(data.message ?? "Thanks — you're on the list.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again later.");
    }
  }

  return (
    <section
      className={cn(pageFullBleedRowClass(), "bg-[#022c22]")}
      aria-labelledby="cta-newsletter-heading"
    >
      <div className={pageFullBleedSectionContentClass()}>
        <div className="mx-auto w-full max-w-[var(--layout-max)] px-8 py-12 sm:py-16 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="flex flex-col gap-4">
              <h2
                id="cta-newsletter-heading"
                className="text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl"
              >
                Get the latest packaging digest
              </h2>
              <p className="max-w-md text-lg text-primary-foreground/70">
                Subscribe now for latest packaging news, trends and more.
              </p>
            </div>
            <form
              onSubmit={onSubmit}
              className="w-full max-w-[400px] shrink-0 lg:ml-auto"
            >
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
                <label htmlFor="cta-newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="cta-newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="shrink-0 bg-[#022c22] text-primary-foreground hover:bg-[#022c22]/90"
                >
                  {status === "loading" ? "Signing up…" : "Sign Up"}
                </Button>
              </div>
              {message && (
                <p
                  className={`mt-2 text-sm ${status === "error" ? "text-destructive" : "text-primary-foreground/80"}`}
                  role={status === "error" ? "alert" : "status"}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
