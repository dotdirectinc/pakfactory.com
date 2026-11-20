import { cache } from "react";
import type { SpecRefs } from "@/lib/spec/library-display";
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
): Promise<{ ok: true; data: T; page?: { has_more: boolean } } | { ok: false; status: number; error: string; code?: string; errors?: string[]; skusNeeded?: SkuNeeded[]; fields?: Record<string, string> }> {
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
    | { data?: T; page?: { has_more: boolean }; error?: string | { code?: string; message?: string; errors?: string[]; skusNeeded?: SkuNeeded[] }; code?: string; fields?: Record<string, string> }
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
      ...(typeof err === "object" && err?.skusNeeded?.length ? { skusNeeded: err.skusNeeded } : {}),
      // A refused spec record edit (PLAT-84) names the fields it refused: { error, code, fields }.
      ...(body?.fields && typeof body.fields === "object" ? { fields: body.fields } : {}),
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

export async function decideChangeset(id: string, decision: "approve" | "discard", revision?: number) {
  // An option's Register frame is approved with the edit revision the approver saw (PROD-3167).
  return call<ChangesetSummary>(
    `/api/v1/changesets/${encodeURIComponent(id)}/${decision}`,
    { method: "POST", ...(revision !== undefined ? { body: { revision } } : {}) },
  );
}

// ── Editing an option's Register frame (PROD-3167) ───────────────────────────

export type OptionEditKind = "offer" | "pair";

/** The frame's shared edit state — polled every 3 s by every open copy. */
export type OptionEditState = {
  state: string;
  approvedBy: string | null;
  /** Who discarded it, when it was discarded (2026-10-26). */
  discardedBy?: string | null;
  /** The pending frame that replaced this one after a Sync Changes. */
  replacedBy: string | null;
  revision: number;
  editedBy: string | null;
  editedAt: string | null;
  /** The edits were made on a proposal a re-sync has since changed. */
  proposalUpdated: boolean;
  edits: { kind: OptionEditKind; target: string; selected: boolean; reason: string | null; by: string | null; at: string }[];
  /** Products whose offers leave a type the option depends on with no compatible option (warning only). */
  gaps: { product: string; group: number; targets: string }[];
};

export type OptionCandidate = { id: string; label: string; group: string };
export type OptionCandidates = { offersDecided: boolean; offers: OptionCandidate[]; pairs: OptionCandidate[] };

export async function getOptionEdits(changesetId: string) {
  return call<OptionEditState>(`/api/v1/changesets/${encodeURIComponent(changesetId)}/option-edits`);
}

export async function getOptionCandidates(changesetId: string) {
  return call<OptionCandidates>(`/api/v1/changesets/${encodeURIComponent(changesetId)}/option-candidates`);
}

/** Save one tick or untick; `reason` only when it is being set (null clears it). */
export async function saveOptionEdit(changesetId: string, edit: { kind: OptionEditKind; target: string; selected: boolean; reason?: string | null }) {
  return call<{ revision: number | null }>(`/api/v1/changesets/${encodeURIComponent(changesetId)}/option-edits`, { method: "POST", body: edit });
}

// ── A Register frame whose mnemonic is chosen on the frame: a property (PROD-3169), a line, a solution or a
// customization category (PROD-3170). Served at property-edit for every kind; only a property has a stream. ──

export type PropertyStream = "CUS" | "PRD" | "ALL";

/** GET /changesets/:id/property-edit — the mnemonic and stream as they stand, polled while the frame is open. */
export type PropertyEditState = {
  state: string;
  approvedBy: string | null;
  discardedBy: string | null;
  replacedBy: string | null;
  /** Approve sends this; the server refuses a stale one. */
  revision: number;
  editedBy: string | null;
  editedAt: string | null;
  proposed: { mnemonic: string; stream?: PropertyStream };
  mnemonic: string | null;
  stream: PropertyStream | null;
  /** The registered code, once approved. */
  code: string | null;
  /** Why the mnemonic as it stands cannot be approved; null when it can. */
  problem: string | null;
  /** Empty for a line, solution or category: only a property has a stream. */
  streams: PropertyStream[];
  /** property, line, solution or category (absent from a server before PROD-3170: a property). */
  kind?: MnemonicFrameKind;
};

export type MnemonicFrameKind = "property" | "line" | "solution" | "category";
export const MNEMONIC_FRAME_KINDS: readonly MnemonicFrameKind[] = ["property", "line", "solution", "category"];

export async function getPropertyEdit(changesetId: string) {
  return call<PropertyEditState>(`/api/v1/changesets/${encodeURIComponent(changesetId)}/property-edit`);
}

/** Save the reviewer's mnemonic and / or stream. */
export async function savePropertyEdit(changesetId: string, edit: { mnemonic?: string; stream?: PropertyStream }) {
  return call<{ revision: number | null }>(`/api/v1/changesets/${encodeURIComponent(changesetId)}/property-edit`, { method: "POST", body: edit });
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
  /** Queued behind an approval still being written to Sanity: writes left (2026-10-26). Absent otherwise. */
  waiting_on_writes?: number;
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
import type { NotionFieldGroup } from "@/lib/spec/notion-fields";
export type { NotionFieldGroup };

export async function requestSyncRun(kind: SyncKind, dataset: string, includeSku = false, notionFields?: readonly NotionFieldGroup[]) {
  // include_sku / notion_fields are sent only when asked, so a backend without the option keeps working.
  const body = {
    kind,
    dataset,
    ...(includeSku ? { include_sku: true } : {}),
    ...(notionFields?.length ? { notion_fields: notionFields } : {}),
  };
  return call<SyncRun>("/api/v1/sync-runs", { method: "POST", body });
}

/** One run, as it is now — the shell's watcher reads it until the run ends. */
export async function getSyncRun(id: string) {
  return call<SyncRun>(`/api/v1/sync-runs/${encodeURIComponent(id)}`);
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
/**
 * One SKU a product gave up (backend #375, 20261022200000): `from → to` when a line or base move replaced
 * it, `to` null when the product was deleted. Retired SKUs are never reused.
 */
export type SkuChange = { from: string; to: string | null; reason: "replaced" | "deleted"; at: string };

export async function listRecordSkuHistory(registryId: string) {
  return call<SkuChange[]>(`/api/v1/records/${encodeURIComponent(registryId)}/sku-history`);
}

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

/**
 * A product the moves take to another line or base, which needs a new SKU (backend 20261022200000):
 * registry product id, its name and current SKU, and why the set was refused for it.
 */
export type SkuNeeded = { productId: string; name: string; sku: string; why: string };

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
  /** `deferred`: a frame of more than 25 documents is written by the worker, not during the request (PROD-3203). */
  written: { applied: number; stale: number; failed: number; deferred?: number } | null;
};

/** One frame from a set of rule edits and moves; `approve` = Submit & approve. */
export async function submitRuleEdits(body: { dataset: string; edits: RegistryRuleEdit[]; moves?: RegistryMove[]; skus?: Record<string, string>; approve: boolean; note?: string; impact?: unknown }) {
  return call<RuleEditResult>("/api/v1/rule-edits", { method: "POST", body });
}

/** The server's check of a set (PROD-3007): what it would refuse, its sentences and the codes it would reissue. Creates nothing. */
export type RuleEditCheck = { dry_run: true; sentences: string[]; items: number; codes: { id: string; code: string }[]; documents: number };
export async function checkRuleEdits(body: { dataset: string; edits: RegistryRuleEdit[]; moves: RegistryMove[]; skus?: Record<string, string> }) {
  return call<RuleEditCheck>("/api/v1/rule-edits/check", { method: "POST", body });
}

/** What approving a pending frame would override in Studio (ADR-025 § 4, amended 2026-10-13). */
export type FrameOverride = { item_id: string; title: string; document: string; field: string; was: unknown; proposed_over: unknown; labels: Record<string, string> };

export async function getFrameOverrides(id: string) {
  return call<FrameOverride[]>(`/api/v1/changesets/${encodeURIComponent(id)}/overrides`);
}

// ── Spec Library review (PFP-124 / PLAT-51, PLAT-81) ──────────────────────────
// spec_production, reviewed and approved record by record (there is no whole-version approval since
// 2026-11-17). A version lists the records it last changed. Changes a new export makes to APPROVED
// records are held until decided. Reads need a registry grant; decisions need `spec.review`.
// `line` is a category id (CAT-FC = folding carton).

export type LibraryReviewState = "pending" | "approve" | "reject" | "defer";
export type LibraryDecision = Exclude<LibraryReviewState, "pending">;

export type LibraryCollectionProgress = {
  collection: string;
  total: number;
  pending: number;
  approve: number;
  reject: number;
  defer: number;
};

export type LibraryImportSummary = {
  new: number;
  updated: number;
  held: number;
  omitted: number;
  unchanged: number;
  diff: number;
  rejectedBefore?: number;
};

export type LibraryVersion = {
  number: number;
  sourceExportedAt: string;
  importedAt: string;
  /** Null for version 1, which was loaded before imports went through spec_workflow. */
  importSummary: LibraryImportSummary | null;
  collections: LibraryCollectionProgress[];
};

export type LibraryItem = {
  sourceId: string;
  label: string | null;
  state: LibraryReviewState;
  note: string | null;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
};

export type LibraryRecord = {
  collection: string;
  record: Record<string, unknown>;
  children: Record<string, unknown[]>;
  history: { decision: LibraryDecision; note: string | null; decidedBy: string; decidedByName: string | null; decidedAt: string }[];
  /** Ids and codes in the record, resolved (backend 20261117220000; absent before it is applied). */
  refs?: SpecRefs;
};

export async function listLibraryVersions(line?: string) {
  return call<LibraryVersion[]>(`/api/v1/library-versions${line ? `?line=${encodeURIComponent(line)}` : ""}`);
}

export async function listLibraryItems(
  version: number,
  q: { collection: string; state?: LibraryReviewState; search?: string; line?: string; limit: number; offset: number },
) {
  const p = new URLSearchParams({ collection: q.collection, limit: String(q.limit), offset: String(q.offset) });
  if (q.state) p.set("state", q.state);
  if (q.line) p.set("line", q.line);
  if (q.search) p.set("search", q.search);
  return call<{ total: number; items: LibraryItem[] }>(`/api/v1/library-versions/${version}/items?${p}`);
}

export async function getLibraryRecord(version: number, collection: string, sourceId: string) {
  return call<LibraryRecord>(
    `/api/v1/library-versions/${version}/items/${encodeURIComponent(collection)}/${encodeURIComponent(sourceId)}`,
  );
}

/** One record in a product type's review group (backend app.spec_review_bundle, PLAT-81). */
export type LibraryBundleItem = {
  collection: "product_type" | "template" | "capability";
  sourceId: string;
  label: string | null;
  version: number;
  state: LibraryReviewState;
  note: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  /** How many product types this record applies to; more than 1 = shared. */
  sharedBy: number;
  level?: "global" | "category" | "type";
  entries?: number;
  group?: { sourceId: string | null; name: string | null; sort: number | null };
};

export type LibraryBundle = {
  productType: { sourceId: string; name: string; version: number; line: string; lineName: string };
  productTypesInLine: number;
  productTypesTotal: number;
  items: LibraryBundleItem[];
};

export async function getLibraryProductTypeReview(sourceId: string) {
  return call<LibraryBundle>(`/api/v1/library-product-types/${encodeURIComponent(sourceId)}/review`);
}

// ── Product type changes and proposals (PLAT-84 API, PLAT-85) ─────────────────────

/** One record of a product type that changed since it was approved (backend spec_workflow.product_type_changes). */
export type ProductTypeChangeItem = {
  collection: "productTypes" | "templates" | "capabilities";
  sourceId: string;
  label: string | null;
  status: "new" | "changed" | "removed";
  /** How many product types use it; more than 1 = shared, decided once for all. */
  sharedBy: number;
  /** An open proposal (PLAT-84), decided by an admin. */
  edit?: number;
  /** An open held change from an export (PLAT-81). */
  changesetItem?: number;
  revision: number;
};

export type ProductTypeChanges = {
  productType: { sourceId: string; name: string; line?: string; lineName?: string };
  counts: { new: number; changed: number; removed: number; unchanged: number };
  items: ProductTypeChangeItem[];
};

export async function getProductTypeChanges(sourceId: string) {
  return call<ProductTypeChanges>(`/api/v1/library-product-types/${encodeURIComponent(sourceId)}/changes`);
}

/** Set as baseline (ADR-028 D7, admin only): approves every new or changed record with nothing open. */
export async function setProductTypeBaseline(sourceId: string) {
  return call<{ productType: string; records: number; shared: number; parts: number; skipped: number }>(
    `/api/v1/library-product-types/${encodeURIComponent(sourceId)}/baseline`,
    { method: "POST", body: {} },
  );
}

// ── Spec record authoring (PLAT-84 API, PLAT-85 editor; ADR-028 D3, D5, D6) ──────────────────────

/** Export collection names the Spec System can author. */
export type SpecCollection =
  | "regions" | "categories" | "productTypes" | "capabilityGroups" | "capabilities" | "sections"
  | "fields" | "templates" | "rules" | "examples" | "equivalencies";
export type SpecOwner = "spec_library" | "spec_system";

/** A record as it is now, in export shape, with the revision an edit must start from. */
export type SpecRecordState = {
  collection: SpecCollection;
  sourceId: string;
  record: Record<string, unknown>;
  revision: number;
  lifecycle: "active" | "retired";
  approved: boolean;
  owner: SpecOwner;
  openEdits: number[];
};

export type SpecEditAction = "create" | "update" | "retire" | "restore";
/** applied = saved (an admin's edit is also approved); proposed = waiting for an admin. */
export type SpecEditResult = {
  edit: number;
  mode: "applied" | "proposed";
  state: string;
  revision: number;
  sourceId: string;
  collection: SpecCollection;
};

export type SpecEdit = {
  id: number;
  subject: "record" | "map";
  action: SpecEditAction;
  collection: SpecCollection | null;
  sourceId: string | null;
  mode: "applied" | "proposed";
  state: "applied" | "approved" | "waiting" | "defer" | "reject";
  source: string;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
  decisionNote: string | null;
  decidedAt: string | null;
};

export async function getSpecCollectionOwners() {
  return call<Record<SpecCollection, SpecOwner>>("/api/v1/spec-collections");
}

export async function getSpecRecord(collection: SpecCollection, sourceId: string) {
  return call<SpecRecordState>(`/api/v1/spec-records/${collection}/${encodeURIComponent(sourceId)}`);
}

/** The next free id for a new record, from words of its name (e.g. ["gloss", "foil"] → CAP-GLOSSFOI). */
export async function suggestSpecSourceId(collection: SpecCollection, parts: string[]) {
  return call<{ sourceId: string }>(
    `/api/v1/spec-records/${collection}/suggest-id?parts=${encodeURIComponent(parts.join(","))}`,
  );
}

/**
 * Save one record edit. The server checks it against the library first (422 with `fields`), refuses a
 * stale baseRevision (409), then applies it (admin) or holds it as a proposal (other roles).
 */
export async function editSpecRecord(
  collection: SpecCollection,
  sourceId: string,
  body: { action: SpecEditAction; record?: Record<string, unknown>; baseRevision?: number | null; note?: string | null },
) {
  return call<SpecEditResult>(`/api/v1/spec-records/${collection}/${encodeURIComponent(sourceId)}/edits`, {
    method: "POST",
    body,
  });
}

export type RemovalFrom = { productType: string } | { line: string };
export type RemovalBlocker = { productType: string; fieldId: string; reason: string };
/** Matches pakfactory.com-server removeCapability.ts (TypeRemoval | LineRemoval) plus the preview fields. */
export type RemovalPreview = {
  preview: true;
  kind: "productType" | "line";
  capability: string;
  blockers: RemovalBlocker[];
  /** From a product type: the fields that offered it there, before and after. */
  fields?: { fieldId: string; label: string | null; before: string[] | null; after: string[] }[];
  status?: { before: string; after: string };
  /** From a line: the product types of that line that lose it. */
  affected?: { productType: string; name: string | null; fields: string[] }[];
  categories?: { before: string[] | null; after: string[] };
  edit: { collection: "templates" | "capabilities"; sourceId: string; action: "create" | "update"; record: Record<string, unknown> } | null;
  baseRevision: number | null;
  owner: SpecOwner;
  writable: boolean;
};

/** Preview removing a capability from a product type or a line (writes nothing). */
export async function previewCapabilityRemoval(capability: string, from: RemovalFrom) {
  return call<RemovalPreview>(`/api/v1/spec-records/capabilities/${encodeURIComponent(capability)}/removals`, {
    method: "POST",
    body: { from },
  });
}

/** Confirm a removal previewed at baseRevision (null when it creates the type's own template). */
export async function confirmCapabilityRemoval(capability: string, from: RemovalFrom, baseRevision: number | null, note: string | null) {
  return call<SpecEditResult>(`/api/v1/spec-records/capabilities/${encodeURIComponent(capability)}/removals`, {
    method: "POST",
    body: { from, confirm: true, baseRevision, note },
  });
}

/** Edits, newest first. state "all" includes applied, approved, rejected and open ones. */
export async function listSpecEdits(q: { state?: "open" | "all"; collection?: SpecCollection; limit?: number } = {}) {
  const p = new URLSearchParams({ state: q.state ?? "all", limit: String(q.limit ?? 500) });
  if (q.collection) p.set("collection", q.collection);
  return call<{ total: number; items: SpecEdit[] }>(`/api/v1/spec-edits?${p}`);
}

/** Decide a proposal (admin only). A reject or defer needs a note. */
export async function decideSpecEdit(edit: number, decision: LibraryDecision, note: string | null) {
  return call<Record<string, unknown>>(`/api/v1/spec-edits/${edit}/decision`, { method: "POST", body: { decision, note } });
}

export async function decideLibraryItems(
  version: number,
  decision: LibraryDecision,
  note: string | null,
  items: { collection: string; sourceId: string }[],
) {
  return call<{ recorded: number; decision: LibraryDecision }>(`/api/v1/library-versions/${version}/decisions`, {
    method: "POST",
    body: { decision, note, items },
  });
}

export type LibraryChangeState = "waiting" | LibraryDecision;

/** A change a new export makes to an approved record, held until decided. */
export type LibraryChange = {
  item: number;
  /** Export collection: capabilities, rules, fields, … */
  collection: string;
  sourceId: string;
  state: LibraryChangeState;
  note: string | null;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
};

export type LibraryDifference = {
  collection: string;
  sourceId: string;
  reason: "waiting" | "deferred" | "rejected" | "omitted" | "differs";
  item: number | null;
};

export async function listLibraryChanges(q: { state?: LibraryChangeState; line?: string } = {}) {
  const p = new URLSearchParams();
  if (q.state) p.set("state", q.state);
  if (q.line) p.set("line", q.line);
  return call<{ version: number | null; items: LibraryChange[]; refs?: SpecRefs }>(`/api/v1/library-changes${p.size ? `?${p}` : ""}`);
}

/** Held changes still waiting for a decision, for the menu and the Review tabs. Unreachable: 0, not an error. */
export const countWaitingLibraryChanges = cache(async (): Promise<number> => {
  const res = await listLibraryChanges({ state: "waiting" });
  return res.ok ? res.data.items.length : 0;
});

export async function decideLibraryChange(item: number, decision: LibraryDecision, note: string | null) {
  return call<{ item: number; decision: LibraryDecision; version: number }>(`/api/v1/library-changes/${item}/decision`, {
    method: "POST",
    body: { decision, note },
  });
}

export async function listLibraryDifferences() {
  return call<LibraryDifference[]>("/api/v1/library-differences");
}

// ── Mapping review (PLAT-52) ─────────────────────────────────────────────────────

export type MappingKind = "product" | "option" | "property_value";
export type MappingLabel = "mapped" | "mapped_with_preset" | "catch_all" | "no_equivalent";
export type MappingTarget = { kind: "product_type" | "capability" | "field"; sourceId: string; name: string | null; setting: string | null; version: number };
export type MappingPreset = { label: string; value: string | null; sourceId: string | null; version: number | null };

/** One customer → production map, with its derived label and latest decision. */
export type MappingItem = {
  id: number;
  subjectKind: MappingKind;
  subjectId: string;
  subjectCode: string;
  subjectName: string | null;
  /** What a reviewer works by: the product's style, the option's category · type, the value's property. */
  group: string | null;
  line: string;
  label: MappingLabel;
  targets: MappingTarget[];
  presets: MappingPreset[];
  presetsNeedingCode: number;
  confidence: "high" | "medium" | "low" | null;
  draftStatus: string | null;
  draftTarget: string | null;
  draftNotes: string | null;
  noEquivalentReason: string | null;
  state: LibraryReviewState;
  note: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
};

export type MappingList = {
  kind: MappingKind;
  total: number;
  states: Partial<Record<LibraryReviewState, number>> | null;
  labels: Partial<Record<MappingLabel, number>> | null;
  items: MappingItem[];
};

export async function listSpecMappings(q: { kind: MappingKind; line?: string; state?: string; label?: string; search?: string }) {
  const p = new URLSearchParams({ kind: q.kind });
  for (const k of ["line", "state", "label", "search"] as const) if (q[k]) p.set(k, q[k]!);
  return call<MappingList>(`/api/v1/spec-mappings?${p}`);
}

export async function decideSpecMappings(decision: LibraryDecision, note: string | null, ids: number[]) {
  return call<{ recorded: number; decision: LibraryDecision }>("/api/v1/spec-mappings/decisions", {
    method: "POST",
    body: { decision, note, ids },
  });
}
