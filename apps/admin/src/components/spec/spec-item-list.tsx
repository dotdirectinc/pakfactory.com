"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { setExclusionAction } from "@/app/(admin)/spec/actions";
import { Input } from "@pakfactory/ui/components/input";
import { Badge } from "@pakfactory/ui/components/badge";
import type { ChangesetItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_COPY, ADMIN_SPEC_SANITY_ITEM_COPY as SANITY } from "@/lib/copy/spec";

type Block = { _type?: string; listItem?: string; children?: { text?: string }[] };
const isBlock = (b: unknown): b is Block => Boolean(b) && typeof b === "object" && Array.isArray((b as Block).children);

/**
 * A Sanity field value as readable text — rich text flattened, lists kept as "• " / "1. ", so a
 * reviewer can read both sides. `marks: false` drops the list markers, to tell a wording change from
 * a formatting-only one.
 */
function plain(v: unknown, marks = true): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    let n = 0;
    return v
      .map((b) => {
        if (!isBlock(b)) return plain(b, marks);
        const text = (b.children ?? []).map((c) => c.text ?? "").join("");
        if (!marks || !b.listItem) { n = 0; return text; }
        n = b.listItem === "number" ? n + 1 : 0;
        return `${b.listItem === "number" ? `${n}.` : "•"} ${text}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_"))
      .map(([, x]) => plain(x, marks))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** Whether a value holds list blocks anywhere (benefits nest them under `body`). */
function hasList(v: unknown): boolean {
  if (Array.isArray(v)) return v.some((b) => (isBlock(b) && Boolean(b.listItem)) || hasList(b));
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).some(hasList);
  return false;
}

/**
 * When the words are identical, say the change is formatting only — otherwise a reviewer reads two
 * identical columns and cannot tell what approving would do (the first Notion frame, 2026-10-06:
 * same benefits text, bullets on one side only).
 */
function formattingOnly(before: unknown, after: unknown): string | null {
  if (plain(before, false) !== plain(after, false)) return null;
  const a = hasList(before);
  const b = hasList(after);
  if (a === b) return SANITY.formattingOnly;
  return a ? SANITY.listToParagraphs : SANITY.paragraphsToList;
}

/** Before → Notion, field by field, for a Sanity-bound item. */
function SanityCompare({ item }: { item: ChangesetItem }) {
  const set = (item.payload.set ?? {}) as Record<string, unknown>;
  const before = (item.payload.before ?? {}) as Record<string, unknown>;
  return (
    <details className="mt-1 w-full">
      <summary className="cursor-pointer text-xs text-muted-foreground">{SANITY.compare}</summary>
      <div className="mt-2 flex flex-col gap-3">
        {Object.keys(set).map((f) => (
          <div key={f} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">{f}</span>
            {formattingOnly(before[f], set[f]) ? (
              <span className="text-xs text-muted-foreground">{formattingOnly(before[f], set[f])}</span>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{SANITY.before}</span>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm text-foreground">{plain(before[f]) || "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{SANITY.after}</span>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm text-foreground">{plain(set[f]) || "—"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Every row the frame would write, as a sentence.
 *
 * This is the part an approver actually reviews. Counts tell you the size of a change,
 * not whether it is right — "831 availability rows" is something you assent to, whereas
 * "Rigid Boxes offers Chipboards" is something you can check against the board.
 *
 * All of them are rendered rather than paged: the reviewer's question is usually "is
 * THIS line here", and a filter over the whole set answers it in one step, where paging
 * would make them hunt. The largest frame is ~1,300 rows, which a browser handles.
 */
type ListProps = {
  items: ChangesetItem[];
  /** Set on a pending sync frame the viewer may decide: rows offer Exclude / Include. */
  exclusion?: { changesetId: string } | null;
};

export function SpecItemList({ items, exclusion = null }: ListProps) {
  const [query, setQuery] = useState("");
  const [busy, startToggle] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const router = useRouter();

  // Per document: every row of it in this frame moves together (the database does the same).
  function toggle(document: string, excluded: boolean) {
    if (!exclusion) return;
    setToggleError(null);
    startToggle(async () => {
      const res = await setExclusionAction(exclusion.changesetId, document, excluded);
      if (!res.ok) setToggleError(res.error);
      router.refresh();
    });
  }

  const rows = useMemo(
    () =>
      items.map((i) => ({
        key: i.id ?? i.deterministic_key,
        text: i.describe ?? `${i.op} ${i.entity_type}`,
        op: i.op,
        item: i,
      })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.text.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-2">
      {exclusion ? <p className="text-xs text-muted-foreground">{ADMIN_SPEC_COPY.excludeHint}</p> : null}
      {toggleError ? <p role="alert" className="text-sm text-destructive">{toggleError}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter these changes — a product, a material, an option…"
          className="max-w-sm"
          aria-label="Filter changes"
        />
        <span className="text-sm text-muted-foreground tabular-nums">
          {query
            ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}`
            : `${rows.length.toLocaleString()} changes`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          Nothing in this frame matches “{query}”.
        </p>
      ) : (
        <ol className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-md border border-border">
          {filtered.map((r) => (
            <li key={r.key} className={`flex flex-wrap items-baseline gap-2 px-3 py-1.5 text-sm ${r.item.excluded_at ? "opacity-60" : ""}`}>
              {r.op !== "insert" ? (
                <span className="shrink-0 text-xs uppercase tracking-wide text-destructive">
                  {r.op}
                </span>
              ) : null}
              <span className={r.item.excluded_at ? "text-muted-foreground line-through" : "text-foreground"}>{r.text}</span>
              {exclusion && r.item.document ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 px-2 text-xs"
                  disabled={busy}
                  onClick={() => toggle(r.item.document!, !r.item.excluded_at)}
                >
                  {r.item.excluded_at ? ADMIN_SPEC_COPY.include : ADMIN_SPEC_COPY.exclude}
                </Button>
              ) : null}
              {r.item.excluded_at ? <span className="w-full text-xs text-muted-foreground">{ADMIN_SPEC_COPY.excludedNote}</span> : null}
              {r.item.is_new ? <Badge variant="outline">{ADMIN_SPEC_COPY.newSinceLastSync}</Badge> : null}
              {r.item.apply_state ? (
                <Badge variant={r.item.apply_state === "applied" ? "secondary" : r.item.apply_state === "pending" ? "outline" : "destructive"}>
                  {SANITY.states[r.item.apply_state]}
                </Badge>
              ) : null}
              {r.item.apply_error ? <span className="w-full text-xs text-destructive">{r.item.apply_error}</span> : null}
              {r.item.entity_type === "sanity_document" ? <SanityCompare item={r.item} /> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
