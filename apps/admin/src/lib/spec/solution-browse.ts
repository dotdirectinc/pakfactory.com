import { createClient } from "next-sanity";
import { getSanityApiVersion, getSanityProjectId } from "@/lib/sanity/env";
import { cachedSpec } from "./cache";
import { RULES_DATASET, type Loaded, type RegistryIdentity } from "./rules-source";
import { studioEditUrl } from "./studio-link";

/**
 * The Solutions browser and the inspiration view of Products (Spec System, PROD-2782). Every
 * solution, its solution styles and its inspiration products as Sanity holds them, each with its
 * registry code. Read-only, like the rest of Spec System: edits happen in Studio.
 *
 * Solution styles are mostly DRAFTS: the catalog fill publishes only First launch rows, so 96 of
 * the 198 exist only as drafts (2026-10-02). Drafts need an authenticated read, so with
 * `ADMIN_SANITY_READ_TOKEN` set this reads every document and says which are drafts; without it,
 * published documents only, and the page says so rather than showing a short list as complete.
 */

const READ_TOKEN = () => process.env.ADMIN_SANITY_READ_TOKEN?.trim() || "";

export const SOLUTIONS_QUERY = /* groq */ `{
  "solutions": *[_type == "solution"]{ _id, title, solutionType, hasPage, entityId, entityCode },
  "styles": *[_type == "solutionStyle"]{ _id, title, entityId, entityCode, "solutionId": solution._ref },
  "inspirations": *[_type == "product" && kind == "inspiration"]{
    _id, title, status, entityId, entityCode,
    "solutionIds": coalesce(solutions[]._ref, []),
    "baseId": basedOn._ref
  },
  "bases": *[_type == "product" && kind == "standard" && !(_id in path("drafts.**"))]{ _id, title, entityCode }
}`;

type Identity = Partial<RegistryIdentity>;
type Raw<T> = ({ _id: string; title?: string } & Identity & T)[];
export type SolutionsResult = {
  solutions: Raw<{ solutionType?: string; hasPage?: boolean }>;
  styles: Raw<{ solutionId?: string }>;
  inspirations: Raw<{ status?: string; solutionIds: string[]; baseId?: string }>;
  bases: Raw<object>;
};

/** Where a document stands in Sanity: live, live with unpublished edits, or never published. */
export type PublishState = "published" | "changed" | "draft";

const DRAFT = "drafts.";
const registryOf = (d: Identity): RegistryIdentity | undefined =>
  d.entityId && d.entityCode ? { entityId: d.entityId, entityCode: d.entityCode } : undefined;
const withRegistry = (d: Identity) => (registryOf(d) ? { registry: registryOf(d) } : {});

/**
 * One row per document, published and draft merged: the published version's fields when there is
 * one (that is what the site shows), else the draft's. References always name the published id.
 */
function merge<T extends { _id: string }>(docs: T[]): (T & { id: string; state: PublishState })[] {
  const byId = new Map<string, { published?: T; draft?: T }>();
  for (const d of docs) {
    const isDraft = d._id.startsWith(DRAFT);
    const id = isDraft ? d._id.slice(DRAFT.length) : d._id;
    const entry = byId.get(id) ?? {};
    if (isDraft) entry.draft = d;
    else entry.published = d;
    byId.set(id, entry);
  }
  return [...byId].map(([id, { published, draft }]) => ({
    ...((published ?? draft) as T),
    id,
    state: published ? (draft ? "changed" : "published") : "draft",
  }));
}

async function fetchSolutions(): Promise<Loaded<{ data: SolutionsResult; includesDrafts: boolean }>> {
  const projectId = getSanityProjectId();
  if (!projectId) return { ok: false, error: "Sanity is not configured for admin" };
  const token = READ_TOKEN();
  const client = createClient({
    projectId,
    dataset: RULES_DATASET,
    apiVersion: getSanityApiVersion(),
    useCdn: !token,
    ...(token ? { token, perspective: "raw" as const } : { perspective: "published" as const }),
  });
  try {
    const data = await client.fetch<SolutionsResult>(SOLUTIONS_QUERY, {}, { cache: "no-store" });
    return { ok: true, data: { data, includesDrafts: Boolean(token) } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sanity query failed" };
  }
}

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);

export type BrowseStyle = { id: string; title: string; registry?: RegistryIdentity; state: PublishState };
export type BrowseInspiration = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  state: PublishState;
  status: string;
  base?: { title: string; code?: string };
  primarySolution?: string;
  studioUrl: string | null;
};
export type BrowseSolution = {
  id: string;
  title: string;
  registry?: RegistryIdentity;
  state: PublishState;
  solutionType?: string;
  hasPage: boolean;
  styles: BrowseStyle[];
  /** Inspiration products whose PRIMARY solution (the first listed) is this one. */
  inspirations: BrowseInspiration[];
};
export type SolutionTree = {
  dataset: string;
  includesDrafts: boolean;
  solutions: BrowseSolution[];
  totals: { solutions: number; styles: number; inspirations: number; registered: number; drafts: number };
};
export type InspirationList = { dataset: string; includesDrafts: boolean; rows: BrowseInspiration[] };

export function buildSolutionTree(raw: SolutionsResult, includesDrafts: boolean): SolutionTree {
  const solutions = merge(raw.solutions);
  const styles = merge(raw.styles);
  const inspirations = buildInspirations(raw, includesDrafts);
  const solutionTitle = new Map(solutions.map((s) => [s.id, s.title ?? s.id]));

  const stylesBySolution = new Map<string, BrowseStyle[]>();
  for (const s of styles) {
    const key = s.solutionId ?? "";
    stylesBySolution.set(key, [
      ...(stylesBySolution.get(key) ?? []),
      { id: s.id, title: s.title ?? s.id, ...withRegistry(s), state: s.state },
    ]);
  }
  const inspirationsBySolution = new Map<string, BrowseInspiration[]>();
  for (const i of inspirations) {
    const key = i.primarySolutionId ?? "";
    inspirationsBySolution.set(key, [...(inspirationsBySolution.get(key) ?? []), i.row]);
  }

  const tree: BrowseSolution[] = solutions
    .map((s) => ({
      id: s.id,
      title: s.title ?? s.id,
      ...withRegistry(s),
      state: s.state,
      ...(s.solutionType ? { solutionType: s.solutionType } : {}),
      hasPage: Boolean(s.hasPage),
      styles: (stylesBySolution.get(s.id) ?? []).sort(byTitle),
      inspirations: (inspirationsBySolution.get(s.id) ?? []).sort(byTitle),
    }))
    .sort((a, b) => (a.solutionType ?? "").localeCompare(b.solutionType ?? "") || byTitle(a, b));
  // Styles and products whose solution is unknown still show, so nothing in the dataset is hidden.
  const orphanStyles = [...stylesBySolution].filter(([id]) => !solutionTitle.has(id)).flatMap(([, x]) => x);
  const orphanInspirations = [...inspirationsBySolution].filter(([id]) => !solutionTitle.has(id)).flatMap(([, x]) => x);
  if (orphanStyles.length || orphanInspirations.length) {
    tree.push({
      id: "",
      // Without drafts, a style or product under a never-published solution lands here too.
      title: includesDrafts ? "No solution" : "No published solution",
      state: "published",
      hasPage: false,
      styles: orphanStyles.sort(byTitle),
      inspirations: orphanInspirations.sort(byTitle),
    });
  }

  const rows = inspirations.map((i) => i.row);
  return {
    dataset: RULES_DATASET,
    includesDrafts,
    solutions: tree,
    totals: {
      solutions: solutions.length,
      styles: styles.length,
      inspirations: inspirations.length,
      registered: [...solutions, ...styles].filter((d) => registryOf(d)).length + rows.filter((r) => r.registry).length,
      drafts: [...solutions, ...styles, ...rows].filter((d) => d.state === "draft").length,
    },
  };
}

function buildInspirations(
  raw: SolutionsResult,
  includesDrafts: boolean,
): { primarySolutionId?: string; row: BrowseInspiration }[] {
  const solutionTitle = new Map(merge(raw.solutions).map((s) => [s.id, s.title ?? s.id]));
  const bases = new Map(raw.bases.map((b) => [b._id, b]));
  return merge(raw.inspirations).map((p) => {
    const primarySolutionId = p.solutionIds[0];
    const base = p.baseId ? bases.get(p.baseId) : undefined;
    return {
      primarySolutionId,
      row: {
        id: p.id,
        title: p.title ?? p.id,
        ...withRegistry(p),
        state: p.state,
        status: p.status ?? "—",
        ...(base ? { base: { title: base.title ?? base._id, ...(base.entityCode ? { code: base.entityCode } : {}) } } : {}),
        ...(primarySolutionId
          ? { primarySolution: solutionTitle.get(primarySolutionId) ?? (includesDrafts ? primarySolutionId : "Unpublished solution") }
          : {}),
        studioUrl: studioEditUrl("product", p.id),
      },
    };
  });
}

export function buildInspirationList(raw: SolutionsResult, includesDrafts: boolean): InspirationList {
  return {
    dataset: RULES_DATASET,
    includesDrafts,
    rows: buildInspirations(raw, includesDrafts).map((i) => i.row).sort(byTitle),
  };
}

export const getSolutionTree = cachedSpec("browse-solutions", async (): Promise<Loaded<SolutionTree>> => {
  const res = await fetchSolutions();
  return res.ok ? { ok: true, data: buildSolutionTree(res.data.data, res.data.includesDrafts) } : res;
});

export const getInspirationList = cachedSpec("browse-inspirations", async (): Promise<Loaded<InspirationList>> => {
  const res = await fetchSolutions();
  return res.ok ? { ok: true, data: buildInspirationList(res.data.data, res.data.includesDrafts) } : res;
});
