"use client";

import { useState } from "react";
import type { RequestAttachment } from "@pakfactory/domain/request";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import { resolveAttachmentUrl } from "@/lib/attachments/resolve-attachment";

/**
 * The customer's files, downloadable.
 *
 * ── Why there is no href until you click ────────────────────────────────────
 * A download URL here is a short-lived presigned GET, and rendering one into the
 * page would mean minting a permit for every file whether or not anyone opens it,
 * then watching it expire while the rep reads the rest of the request. Worse, it
 * would sit in the DOM — copyable, and valid for anyone holding it (ADR-0013 D3).
 *
 * So the permit is minted on click, used immediately, and never stored.
 */

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
    <ul className="flex flex-col gap-2">
      {attachments.map((file) => {
        const size = formatBytes(file.bytes);
        const busy = busyId === file.id;
        return (
          <li key={file.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => void download(file.id)}
              disabled={busy}
              className="text-sm font-medium underline underline-offset-4 hover:no-underline disabled:opacity-60"
            >
              {file.name}
            </button>
            <span className="text-xs text-muted-foreground">
              {[file.kind, size].filter(Boolean).join(" · ")}
            </span>
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
          </li>
        );
      })}
    </ul>
  );
}
