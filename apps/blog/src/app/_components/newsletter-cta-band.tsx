"use client";

import { useState } from "react";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";

type NewsletterCtaBandProps = {
  className?: string;
};

/**
 * Newsletter capture band (PROD-1506). Submits to `/api/newsletter` when configured.
 */
export function NewsletterCtaBand({ className }: NewsletterCtaBandProps) {
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
    <section className={className} aria-labelledby="newsletter-heading">
      <div className="rounded-lg border px-6 py-8">
        <h2 id="newsletter-heading" className="text-lg font-semibold tracking-tight">
          Packaging insights in your inbox
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trends, sustainability, and design — no spam.
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </Button>
        </form>
        {message && (
          <p
            className={`mt-2 text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
