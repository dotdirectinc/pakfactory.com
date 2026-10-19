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

export type ChangesetState = "draft" | "approved" | "discarded" | "superseded";

export type ChangesetSummary = {
  id: string;
  source: string;
  frame: string;
  state: ChangesetState;
  summary: Record<string, unknown>;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  /** Rows in the frame — what the list endpoint sends (it never sent `item_counts`, so Items showed "—"). */
  item_count?: number;
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
  /** The record this row is about — what Exclude acts on (sync frames, PROD-2751). */
  document?: string | null;
  /** Left out of this frame's approval. */
  excluded_at?: string | null;
  /** This change was not in the frame this one replaced — new since the last sync (2026-10-06). */
  is_new?: boolean;
  /** Studio values this write replaced (ADR-025 § 4, amended 2026-10-13): kept so they can be put back. */
  overrode?: { document: string; field: string; was: unknown }[] | null;
};

export type ChangesetDetail = ChangesetSummary & {
  items: ChangesetItem[];
  /** A pending sync frame: its documents can be excluded before approving. */
  excludable?: boolean;
};

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
): Promise<{ ok: true; data: T; page?: { has_more: boolean } } | { ok: false; status: number; error: string; code?: string; errors?: string[] }> {
  const started = performance.now();
  const token = await accessToken();
  const tokenMs = Math.round(performance.now() - started);
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

  // PROD-3116: each registry call's time (token lookup + request), in the server logs.
  console.info(`[timing] api ${init?.method ?? "GET"} ${path.split("?")[0]} ${res.status} ${Math.round(performance.now() - started)}ms (token ${tokenMs})`);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; page?: { has_more: boolean }; error?: string | { code?: string; message?: string; errors?: string[] }; code?: string }
    | null;

  if (!res.ok) {
    // Most errors are `{ error: string, code }`; a refused rule edit is `{ error: { code, message, errors[] } }`.
    const err = body?.error;
    return {
      ok: false,
      status: res.status,
      error: (typeof err === "string" ? err : err?.message) ?? `Registry API returned ${res.status}.`,
      code: typeof err === "object" && err ? err.code : body?.code,
      ...(typeof err === "object" && err?.errors ? { errors: err.errors } : {}),
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

/**
 * Memoised per request (PROD-3115): the layout counts the waiting frames for the sidebar and the
 * Registry lists them — one backend call serves both.
 */
export const listDraftChangesets = cache(async () => callAll<ChangesetSummary>("/api/v1/changesets?state=draft"));

/**
 * One page of frames (PROD-3115): the Registry's recently approved, and the edit history. The server
 * counts rows for the returned page only, so a short page is cheap — unlike listing every frame.
 */
export async function listChangesetsPage(q: { state?: ChangesetState; source?: string; order?: "created" | "approved"; limit: number }) {
  const params = new URLSearchParams({ limit: String(q.limit) });
  if (q.state) params.set("state", q.state);
  if (q.source) params.set("source", q.source);
  if (q.order) params.set("order", q.order);
  return call<ChangesetSummary[]>(`/api/v1/changesets?${params}`);
}

/**
 * Which of these frames have an approved changeset (PROD-3114). A frame's page needs only its own
 * prerequisites' states, so it asks about those — one small request each — instead of listing and
 * counting every changeset ever made. Best-effort, as before: a failed lookup counts as approved, so
 * the button stays available and the backend refuses an out-of-order approval — the guard that
 * actually matters.
 */
export async function approvedFrames(frames: string[]): Promise<Set<string>> {
  const unique = [...new Set(frames)];
  const found = await Promise.all(
    unique.map(async (f) => {
      const res = await call<ChangesetSummary[]>(`/api/v1/changesets?state=approved&frame=${encodeURIComponent(f)}&limit=1`);
      return !res.ok || res.data.length > 0 ? f : null;
    }),
  );
  return new Set(found.filter((f): f is string => f !== null));
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

export type SyncTrigger = "manual" | "automatic";

export type SyncRun = {
  id: string;
  kind: SyncKind;
  dataset: string;
  state: SyncRunState;
  /** How the run started (PROD-2772): a person, or the worker because Sanity changed. Absent on older backends. */
  trigger?: SyncTrigger;
  /** The person asked for SKUs too (permanent once approved). Absent on older backends. */
  include_sku?: boolean;
  /** Null for an automatic run. */
  requested_by: string | null;
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
    report?: { unresolved?: unknown[]; unknownStatus?: unknown[]; reportOnly?: Record<string, number>; rulesDrift?: RulesDrift; structureDrift?: RulesDrift };
    /** An automatic run left the frames alone because one was waiting for review. */
    skipped?: string;
  } | null;
};

/** Who owns a dataset's catalog relations (PROD-2988 / PROD-3008): the Spec System or Studio. */
export type RelationsOwnerValue = "spec" | "studio";
export type RelationsOwner = {
  dataset: string;
  rules: RelationsOwnerValue;
  structure: RelationsOwnerValue;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  /** "registry" once the switch has been used; "default" = never set (Studio owns both). */
  source: "registry" | "default" | "env";
};

export async function getRelationsOwner(dataset: string) {
  return call<RelationsOwner>(`/api/v1/spec-relations-owner?dataset=${encodeURIComponent(dataset)}`);
}

/** Admins only (`relations.owner`). The server also tells Studio; if it cannot, nothing changes. */
export async function setRelationsOwner(body: { dataset: string; rules: RelationsOwnerValue; structure: RelationsOwnerValue; note?: string }) {
  return call<RelationsOwner>("/api/v1/spec-relations-owner", { method: "PUT", body });
}

/** The last 20 runs, newest first. */
/** Memoised per request: the Registry's sync button, problems and recent activity share one read. */
export const listSyncRuns = cache(async () => call<SyncRun[]>("/api/v1/sync-runs"));

/**
 * Ask the backend to sync — Sanity → registry, or Notion → Sanity. The run is queued and the worker
 * takes it within seconds; what it finds arrives as draft frames, never as live changes.
 */
export async function requestSyncRun(kind: SyncKind, dataset: string, includeSku = false) {
  // include_sku is sent only when asked, so a backend without the option keeps working.
  const body = includeSku ? { kind, dataset, include_sku: true } : { kind, dataset };
  return call<SyncRun>("/api/v1/sync-runs", { method: "POST", body });
}

/** Hide a finished run from the panel. The backend keeps the row. */
export async function dismissSyncRun(id: string) {
  return call<SyncRun>(`/api/v1/sync-runs/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
}

/** Leave a document out of a pending sync frame's approval, or bring it back. */
export async function setDocumentExclusion(changesetId: string, document: string, excluded: boolean) {
  return call<{ document: string; excluded: boolean; rows: number }>(
    `/api/v1/changesets/${encodeURIComponent(changesetId)}/exclusions`,
    { method: "POST", body: { document, excluded } },
  );
}

/** An approved change that did not reach Sanity (PROD-2751, 2026-10-07). */
export type SyncWriteProblem = {
  item_id: string;
  changeset_id: string;
  frame: string;
  approved_at: string;
  title: string;
  fields: string[];
  state: "stale" | "failed" | "stuck";
  error: string | null;
};

/** Approved Sanity-bound changes from the last 30 days that ended stale, failed, or stuck pending. */
export async function listSyncWriteProblems() {
  return call<SyncWriteProblem[]>("/api/v1/sync-runs/write-problems");
}

// ── Sync history (PROD-2771) ─────────────────────────────────────────────────

export type SyncPerson = { id: string; name: string | null } | null;

/** The latest re-check of an approved frame: of the fields it changed, how many still differ now. */
export type SyncRecheck = {
  run_id: string;
  at: string;
  checked: number;
  still_differ: number;
  items: { id: string; title: string | null }[];
};

export type SyncHistoryFrame = {
  id: string;
  frame: string;
  items: number;
  excluded: number;
  state: "draft" | "approved" | "discarded" | "superseded" | "unknown";
  approved_by: SyncPerson;
  approved_at: string | null;
  discarded_by: SyncPerson;
  discarded_at: string | null;
  superseded_at: string | null;
  /** Sanity-bound frames only: how the approved rows were written. */
  writes_to_sanity: { applied: number; pending: number; stale: number; failed: number } | null;
  recheck: SyncRecheck | null;
};

export type SyncHistoryRun = {
  id: string;
  kind: SyncKind;
  dataset: string;
  state: SyncRunState;
  trigger?: SyncTrigger;
  requested_by: SyncPerson;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  dismissed_at: string | null;
  documents: number | null;
  recheck_error: string | null;
  skipped?: string | null;
  /** Sync Changes only (PROD-2986): customization rules where the registry and Sanity disagree. */
  rules_drift?: RulesDrift | null;
  /** Sync Changes only (PROD-3006): records' parents where the registry and Sanity disagree. */
  structure_drift?: RulesDrift | null;
  /** Sync Changes only (PROD-3117): content Sanity owns where the registry disagreed when the run read it. */
  content_drift?: ContentDrift | null;
  /** Sync Changes only (PROD-3118): what the run applied itself, with no frame. The changes load on open. */
  applied?: SyncApplied | null;
  frames: SyncHistoryFrame[];
};

/** Content Sanity owns where the registry disagreed, per kind, with a few examples (PROD-3117). */
export type ContentDrift = RulesDrift & { examples?: Record<string, { title: string; sanity: string; registry: string }[]> };

/** What a run applied with no frame (PROD-3118): counts and failures; the changes load per run. */
export type SyncApplied = {
  planned: number;
  applied: number;
  failed: { key: string; title: string | null; error: string }[];
  skipped?: string;
  has_items?: boolean;
};
export type SyncAppliedItem = {
  entity_type: string;
  op: string;
  target_id: string | null;
  title: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

/** One run's applied changes (up to 200), loaded when the run is opened in Sync history (PROD-3119). */
export async function getSyncRunApplied(runId: string) {
  return call<(SyncApplied & { items?: SyncAppliedItem[] }) | null>(`/api/v1/sync-runs/${encodeURIComponent(runId)}/applied`);
}

/** A change a sync run applied to one record (PROD-3119), from the registry's audit trail. */
export type RecordSyncChange = {
  at: string;
  run: { id: string; trigger: "manual" | "automatic"; by: string | null };
  change: "added" | "removed" | "updated";
  property_value: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

/** One record's changes from Sync Changes, newest first (50). `registryId` is the record's registry uuid. */
export async function listRecordSyncChanges(registryId: string) {
  return call<RecordSyncChange[]>(`/api/v1/records/${encodeURIComponent(registryId)}/sync-changes`);
}

/** Customization rules where the registry and Sanity disagree, decided or not (PROD-2986, ADR-025). */
export type RulesDrift = { total: number; byKind: Record<string, number> };

/** Past and current syncs, newest first, with their frames, decisions and re-checks. */
export async function listSyncHistory(limit = 30) {
  return call<SyncHistoryRun[]>(`/api/v1/sync-runs/history?limit=${limit}`);
}

// ── Rule edits (PROD-2962 → backend PROD-2987) ─────────────────────────────────────────────────

/** An edit as the backend takes it: registry ids. */
export type RegistryRuleEdit =
  | { kind: "typeSettings"; typeId: string; decidedBy?: "product" | "customization"; customerSelects?: "one" | "many" }
  | { kind: "requirements"; typeId: string; groups: ({ typeId: string } | { categoryId: string })[][] }
  | { kind: "pair"; a: string; b: string; compatible: boolean }
  | { kind: "offer"; productId: string; optionId: string; offered: boolean }
  | { kind: "exception"; productId: string; optionId: string; mode: "add" | "remove"; reason: string | null };

/** A structure move as the backend takes it (PROD-3006): registry ids. */
export type RegistryMove =
  | { kind: "productPlacement"; productId: string; lineId: string; styleIds: string[] }
  | { kind: "styleLine"; styleId: string; lineId: string }
  | { kind: "basedOn"; productId: string; baseId: string }
  | { kind: "solutions"; productId: string; solutionIds: string[] }
  | { kind: "optionType"; optionId: string; typeId: string }
  | { kind: "typeCategory"; typeId: string; categoryId: string }
  | { kind: "solutionStyleSolution"; styleId: string; solutionId: string };

export type RuleEditResult = {
  changeset_id: string;
  frame: string;
  state: "draft" | "approved";
  sentences: string[];
  items: number;
  written: { applied: number; stale: number; failed: number } | null;
};

/** One frame from a set of rule edits and moves; `approve` = Submit & approve. */
export async function submitRuleEdits(body: { dataset: string; edits: RegistryRuleEdit[]; moves?: RegistryMove[]; approve: boolean; note?: string; impact?: unknown }) {
  return call<RuleEditResult>("/api/v1/rule-edits", { method: "POST", body });
}

/** The server's check of a set (PROD-3007): what it would refuse, its sentences and the codes it would reissue. Creates nothing. */
export type RuleEditCheck = { dry_run: true; sentences: string[]; items: number; codes: { id: string; code: string }[]; documents: number };
export async function checkRuleEdits(body: { dataset: string; edits: RegistryRuleEdit[]; moves: RegistryMove[] }) {
  return call<RuleEditCheck>("/api/v1/rule-edits/check", { method: "POST", body });
}

/** What approving a pending frame would override in Studio (ADR-025 § 4, amended 2026-10-13). */
export type FrameOverride = { item_id: string; title: string; document: string; field: string; was: unknown; proposed_over: unknown; labels: Record<string, string> };

export async function getFrameOverrides(id: string) {
  return call<FrameOverride[]>(`/api/v1/changesets/${encodeURIComponent(id)}/overrides`);
}
