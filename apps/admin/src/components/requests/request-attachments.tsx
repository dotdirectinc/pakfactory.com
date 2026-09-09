"use client";

import { useState } from "react";
import type { RequestAttachment } from "@pakfactory/domain/request";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import { resolveAttachmentUrl } from "@/lib/attachments/resolve-attachment";

/**
 * The customer's files — viewable in place, and downloadable.
 *
 * ── Two different mechanisms, on purpose ────────────────────────────────────
 * VIEW goes through `/api/attachments/<rfqId>/<attachmentId>`, a same-origin path
 * that authorises on every hit and redirects to a fresh inline permit. That is
 * what lets a url live in the DOM at all: it is worthless without the admin
 * session cookie, and it cannot go stale while the page sits open.
 *
 * DOWNLOAD still mints on click through the server action and navigates
 * immediately, because a download needs the permit in the browser's hands and
 * there is nothing to gain from holding one before the rep asks (ADR-0013 D3).
 *
 * Everything the buyer can upload is browser-viewable — png, jpeg, webp, gif,
 * pdf (`ALLOWED_CONTENT_TYPES`) — so the only split here is images, which get a
 * thumbnail, versus pdf, which gets a button rather than an embedded viewer: a
 * 25MB spec sheet in an iframe on a list of eight files is not a page anyone
 * wants to load.
 */

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function previewHref(rfqId: string, attachmentId: string): string {
  return `/api/attachments/${encodeURIComponent(rfqId)}/${encodeURIComponent(attachmentId)}`;
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`;
}

export function RequestAttachments({
  rfqId,
  attachments,
}: {
  rfqId: string;
  attachments: RequestAttachment[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<RequestAttachment | null>(null);

  async function download(attachmentId: string) {
    setBusyId(attachmentId);
    setErrorId(null);
    try {
      const result = await resolveAttachmentUrl(rfqId, attachmentId);
      if (!result.ok) {
        setErrorId(attachmentId);
        return;
      }
      // The permit already carries Content-Disposition: attachment, set from the
      // stored row — so navigating to it downloads rather than renders, and the
      // filename is the one we recorded, not one the browser guesses from the key.
      window.location.assign(result.url);
    } catch {
      setErrorId(attachmentId);
    } finally {
      setBusyId(null);
    }
  }

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ADMIN_REQUESTS_COPY.emptyArtwork}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {attachments.map((file) => {
          const size = formatBytes(file.bytes);
          const busy = busyId === file.id;
          const image = isImage(file.contentType);
          // A preview that 404s means the permit could not be minted — the file
          // row still has to work, so fall back to the name and the buttons
          // rather than leaving a broken image in the page.
          const broken = brokenIds.includes(file.id);

          return (
            <li key={file.id} className="flex items-start gap-3">
              {image && !broken ? (
                <button
                  type="button"
                  onClick={() => setLightbox(file)}
                  className="shrink-0 overflow-hidden rounded-sm border bg-muted"
                  aria-label={`${ADMIN_REQUESTS_COPY.attachmentView} ${file.name}`}
                >
                  {/* A plain <img>, not next/image: the source is a redirect to
                      a signed, time-limited S3 url, and the optimizer would have
                      to fetch and cache it — the one thing a short-lived permit
                      must not allow. */}
                  <img
                    src={previewHref(rfqId, file.id)}
                    alt={file.name}
                    loading="lazy"
                    onError={() =>
                      setBrokenIds((prev) =>
                        prev.includes(file.id) ? prev : [...prev, file.id],
                      )
                    }
                    className="h-20 w-20 object-cover"
                  />
                </button>
              ) : (
                <span
                  aria-hidden
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border bg-muted text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {file.contentType === "application/pdf" ? "PDF" : "FILE"}
                </span>
              )}

              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[file.kind, size].filter(Boolean).join(" · ")}
                </span>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {image && !broken ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(file)}
                      className="text-sm font-medium underline underline-offset-4 hover:no-underline"
                    >
                      {ADMIN_REQUESTS_COPY.attachmentView}
                    </button>
                  ) : (
                    // Not an image, or its preview failed: open the inline permit
                    // in a tab and let the browser's own viewer handle it.
                    <a
                      href={previewHref(rfqId, file.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium underline underline-offset-4 hover:no-underline"
                    >
                      {ADMIN_REQUESTS_COPY.attachmentOpen}
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void download(file.id)}
                    disabled={busy}
                    className="text-sm font-medium underline underline-offset-4 hover:no-underline disabled:opacity-60"
                  >
                    {ADMIN_REQUESTS_COPY.attachmentDownload}
                  </button>

                  {busy ? (
                    <span className="text-xs text-muted-foreground">
                      {ADMIN_REQUESTS_COPY.attachmentOpening}
                    </span>
                  ) : null}
                  {errorId === file.id ? (
                    <span className="text-xs text-destructive">
                      {ADMIN_REQUESTS_COPY.attachmentError}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.name}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-6"
        >
          {/* Plain <img>, for the same reason as the thumbnail above. */}
          <img
            src={previewHref(rfqId, lightbox.id)}
            alt={lightbox.name}
            className="max-h-[80vh] max-w-full object-contain"
          />
          <p className="text-sm text-white">{lightbox.name}</p>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="text-sm font-medium text-white underline underline-offset-4"
          >
            {ADMIN_REQUESTS_COPY.attachmentClose}
          </button>
        </div>
      ) : null}
    </>
  );
}
