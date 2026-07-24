"use client";

import { useEffect } from "react";

/**
 * Global error boundary (AC#2, PROD-2183) — the last resort. Next renders this in
 * place of the ROOT LAYOUT when the layout itself throws (nav / footer / global
 * settings), so it must supply its own <html>/<body>.
 *
 * The blog layout's data fetches already catch and fall back, so reaching this
 * should be rare — but it guarantees no white screen even if something upstream of
 * the page throws. Fully self-contained with inline styles: it must render
 * correctly without depending on the layout, its CSS, or any data source.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blog] global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "4rem 1rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#0a0a0a",
          background: "#ffffff",
        }}
      >
        <div style={{ maxWidth: "36rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#737373", margin: "0 0 0.75rem" }}>
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: "0 0 0.75rem",
            }}
          >
            The blog couldn&rsquo;t load
          </h1>
          <p style={{ color: "#737373", margin: 0 }}>
            We hit a temporary problem. Please try again &mdash; it usually clears in a
            moment.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            appearance: "none",
            border: "1px solid #0a0a0a",
            borderRadius: "0.5rem",
            background: "#0a0a0a",
            color: "#ffffff",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
