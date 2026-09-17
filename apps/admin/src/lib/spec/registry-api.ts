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
const BASE = process.env.SPEC_API_URL ?? "http://localhost:8080";

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
  init?: { method?: string },
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; code?: string }> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
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
    | { data?: T; error?: string; code?: string }
    | null;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body?.error ?? `Registry API returned ${res.status}.`,
      code: body?.code,
    };
  }
  return { ok: true, data: (body?.data ?? body) as T };
}

/** Who the backend thinks this person is, and what their grant allows. */
export async function fetchSpecMe(): Promise<SpecMe | null> {
  const res = await call<SpecMe>("/api/spec-me");
  return res.ok ? res.data : null;
}

export async function listDraftChangesets() {
  return call<ChangesetSummary[]>("/api/v1/changesets?state=draft&page_size=100");
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
  return call<ChangesetSummary[]>("/api/v1/changesets?page_size=200");
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
