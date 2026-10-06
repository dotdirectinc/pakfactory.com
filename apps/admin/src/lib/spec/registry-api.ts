import { cache } from "react";
import { createClient } from "@pakfactory/supabase/server";

/**
 * The registry API, called AS THE SIGNED-IN PERSON (PROD-2515 / ADR-0016).
 *
 * The admin app holds no registry credential. It forwards the user's own Supabase
 * access token, and the backend resolves it to an `internal_user` and then to a
 * registry grant. So what a reviewer can do here is exactly what their grant allows
 * — the browser never receives a registry secret, and this app cannot approve
 * anything on its own behalf.
 *
 * Every call is server-side for the same reason: a token that reached client code
 * could be replayed against the registry from anywhere.
 */
// The same backend the attachment resolver calls, and the same variable — it is already
// set in every environment, so a new one would only be a second thing to forget.
const BASE = (process.env.BACKEND_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export type ChangesetState = "draft" | "approved" | "discarded";

export type ChangesetSummary = {
  id: string;
  source: string;
  frame: string;
  state: ChangesetState;
  summary: Record<string, unknown>;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  item_counts?: { entity_type: string; op: string; count: number }[];
};

export type ChangesetItem = {
  id: string;
  seq: number;
  entity_type: string;
  op: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  deterministic_key: string;
  /** The row as a sentence, in the board's words — what a reviewer actually checks. */
  describe?: string;
  /** Sanity-bound items (PROD-2751): the document, and how the approved write went. */
  target_ref?: string | null;
  apply_state?: "pending" | "applied" | "stale" | "failed" | null;
  apply_error?: string | null;
};

export type ChangesetDetail = ChangesetSummary & { items: ChangesetItem[] };

export type SpecMe = {
  authenticated: boolean;
  staff?: boolean;
  role: string | null;
  capabilities: string[];
  user?: { id: string; email: string | null; display_name: string | null };
};

/** The caller's access token, or null when there is no session. */
async function accessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function call<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: true; data: T; page?: { has_more: boolean } } | { ok: false; status: number; error: string; code?: string }> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      // Never cached: a reviewer deciding a frame must see the state as it is now,
      // and a stale "draft" would offer an approve button for something already done.
      cache: "no-store",
    });
  } catch {
    // The registry is a separate service. When it is down, say so plainly rather
    // than rendering an empty list that reads as "nothing to approve".
    return { ok: false, status: 503, error: "The registry API is not reachable." };
  }

  const body = (await res.json().catch(() => null)) as
    | { data?: T; page?: { has_more: boolean }; error?: string; code?: string }
    | null;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body?.error ?? `Registry API returned ${res.status}.`,
      code: body?.code,
    };
  }
  return { ok: true, data: (body?.data ?? body) as T, page: body?.page };
}

/** Who the backend thinks this person is, and what their grant allows. */
/**
 * Memoised per request: the admin layout asks (to decide whether Spec System is in the
 * sidebar) and so does every /spec page (to 404 without a grant) — one backend call serves both.
 */
export const fetchSpecMe = cache(async (): Promise<SpecMe | null> => {
  const res = await call<SpecMe>("/api/spec-me");
  return res.ok ? res.data : null;
});

/**
 * Every page of a v1 list. The API pages by `limit` (max 200) and `offset` and says `has_more`;
 * one request returns at most a page, and the default is 50 — a single call silently drops the
 * rest. (It did: `page_size` is not a parameter, so these lists stopped at 50.)
 */
async function callAll<T>(path: string) {
  const PAGE = 200;
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await call<T[]>(`${path}${sep}limit=${PAGE}&offset=${offset}`);
    if (!res.ok) return res;
    out.push(...res.data);
    if (!res.page?.has_more || res.data.length === 0) return { ok: true as const, data: out };
  }
}

export async function listDraftChangesets() {
  return callAll<ChangesetSummary>("/api/v1/changesets?state=draft");
}

/**
 * Every changeset, whatever its state.
 *
 * Readiness needs the APPROVED ones too: a frame is unblocked precisely because its
 * prerequisites have been approved, and those are no longer drafts. Computing it from the
 * draft list alone would leave every dependent frame blocked for ever — the prerequisite
 * disappears from the list at the exact moment it stops being a problem.
 */
export async function listAllChangesets() {
  return callAll<ChangesetSummary>("/api/v1/changesets");
}

export async function getChangesetDetail(id: string) {
  return call<ChangesetDetail>(`/api/v1/changesets/${encodeURIComponent(id)}`);
}

export async function decideChangeset(id: string, decision: "approve" | "discard") {
  return call<ChangesetSummary>(
    `/api/v1/changesets/${encodeURIComponent(id)}/${decision}`,
    { method: "POST" },
  );
}

// ── Catalog sync (PROD-2751) ─────────────────────────────────────────────────

export type SyncRunState = "requested" | "running" | "done" | "failed";

/** A frame the run loaded as a draft — it now waits in the list above. */
export type SyncRunLoaded = { id: string; frame: string; items: number };

export type SyncKind = "sanity" | "notion";

export type SyncRun = {
  id: string;
  kind: SyncKind;
  dataset: string;
  state: SyncRunState;
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  /** Hidden from the panel by a person; the run itself is kept (2026-10-06). */
  dismissed_at?: string | null;
  result: {
    documents?: number;
    proposed?: { frame: string; items: number }[];
    loaded?: SyncRunLoaded[];
    report?: { unresolved?: unknown[]; unknownStatus?: unknown[]; reportOnly?: Record<string, number> };
  } | null;
};

/** The last 20 runs, newest first. */
export async function listSyncRuns() {
  return call<SyncRun[]>("/api/v1/sync-runs");
}

/**
 * Ask the backend to sync — Sanity → registry, or Notion → Sanity. The run is queued and the worker
 * takes it within seconds; what it finds arrives as draft frames, never as live changes.
 */
export async function requestSyncRun(kind: SyncKind, dataset: string) {
  return call<SyncRun>("/api/v1/sync-runs", { method: "POST", body: { kind, dataset } });
}

/** Hide a finished run from the panel. The backend keeps the row. */
export async function dismissSyncRun(id: string) {
  return call<SyncRun>(`/api/v1/sync-runs/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
}
