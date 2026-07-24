"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@pakfactory/ui/components/button";

/**
 * Route-level error boundary (AC#2, PROD-2183). Rendered inside the root layout, so
 * the site nav + footer stay intact — a page render that throws (e.g. an unguarded
 * Sanity failure or quota block) shows this graceful, branded page with a retry
 * instead of a blank screen.
 *
 * Deliberately fetches nothing: the safety net must not depend on the same data
 * source that may have caused the error, or it could re-throw.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blog] route error boundary:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          This page didn&rsquo;t load
        </h1>
        <p className="text-muted-foreground">
          We hit a temporary problem loading this content. Please try again &mdash; it
          usually clears in a moment.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the blog</Link>
        </Button>
      </div>
    </main>
  );
}
