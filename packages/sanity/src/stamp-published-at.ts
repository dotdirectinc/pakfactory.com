import { createClient } from "@sanity/client";

/**
 * PROD-2228 — seed editorial `publishedAt` when a post / caseStudy goes live
 * without one (native Schedule / Releases bypass Studio publish actions).
 *
 * Safe for webhook handlers: never throws; no-ops when the write token is
 * missing or the date is already set. Prefer `set` over `setIfMissing` so an
 * empty-string field still gets stamped.
 */

const STAMPABLE_TYPES = new Set(["post", "caseStudy"]);

export type StampPublishedAtInput = {
  /** Published document id (drafts. / versions. prefixes are stripped). */
  documentId: string;
  /** Optional `_type` from the webhook payload — skips non-stampable types early. */
  documentType?: string;
  /** Optional `publishedAt` from the webhook payload — skip fetch when already set. */
  publishedAtFromPayload?: string | null;
  projectId: string;
  dataset: string;
  apiVersion?: string;
  /** Defaults to `process.env.SANITY_API_WRITE_TOKEN`. */
  writeToken?: string;
};

export type StampPublishedAtResult =
  | { status: "stamped"; publishedAt: string }
  | { status: "skipped"; reason: string };

function toPublishedId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // drafts.{id} → {id}; versions.{release}.{id} → {id}
  if (trimmed.startsWith("drafts.")) {
    return trimmed.slice("drafts.".length) || null;
  }
  if (trimmed.startsWith("versions.")) {
    const parts = trimmed.split(".");
    // versions.<releaseId>.<documentId> — documentId may itself contain dots? usually not
    return parts.length >= 3 ? parts.slice(2).join(".") : null;
  }
  return trimmed;
}

export async function stampPublishedAtIfMissing(
  input: StampPublishedAtInput,
): Promise<StampPublishedAtResult> {
  try {
    if (
      input.documentType &&
      !STAMPABLE_TYPES.has(input.documentType)
    ) {
      return { status: "skipped", reason: "type-not-stampable" };
    }

    if (input.publishedAtFromPayload?.trim()) {
      return { status: "skipped", reason: "already-set-in-payload" };
    }

    const id = toPublishedId(input.documentId);
    if (!id) {
      return { status: "skipped", reason: "no-document-id" };
    }

    const token =
      input.writeToken?.trim() ||
      (typeof process !== "undefined"
        ? process.env.SANITY_API_WRITE_TOKEN?.trim()
        : undefined);
    if (!token) {
      return { status: "skipped", reason: "no-write-token" };
    }

    if (!input.projectId?.trim() || !input.dataset?.trim()) {
      return { status: "skipped", reason: "sanity-not-configured" };
    }

    const client = createClient({
      projectId: input.projectId.trim(),
      dataset: input.dataset.trim(),
      apiVersion: input.apiVersion?.trim() || "2025-02-19",
      token,
      useCdn: false,
    });

    const doc = await client.fetch<{
      publishedAt?: string | null;
      _type?: string;
    } | null>(`*[_id == $id][0]{ publishedAt, _type }`, { id });

    if (!doc) {
      return { status: "skipped", reason: "not-found" };
    }
    if (doc._type && !STAMPABLE_TYPES.has(doc._type)) {
      return { status: "skipped", reason: "type-not-stampable" };
    }
    if (doc.publishedAt?.trim()) {
      return { status: "skipped", reason: "already-set" };
    }

    const publishedAt = new Date().toISOString();
    await client.patch(id).set({ publishedAt }).commit({
      autoGenerateArrayKeys: false,
    });

    return { status: "stamped", publishedAt };
  } catch (err) {
    console.error("[stampPublishedAtIfMissing] failed:", err);
    return {
      status: "skipped",
      reason: `error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
