"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { decideChangesAction, setBaselineAction } from "@/app/(admin)/spec/library/actions";
import { approveAllPlan, baselinePlan, canDecideRow, type ChangeGroups, type ChangeRoute, type ChangeRow } from "@/lib/spec/library-changes";
import { noteRequired } from "@/lib/spec/library-review";
import type { LibraryDecision } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

const COPY = ADMIN_SPEC_LIBRARY_COPY.typeChanges;
type Me = { review: boolean; admin: boolean };

/**
 * A product type's changes (PLAT-85): its records that are new, changed or removed since they were
 * last approved, each decided on its own. A shared record is decided once and shows as decided on
 * every product type that uses it. Unchanged records are not listed.
 */
export function LibraryChangeList({ productType, groups, me }: { productType: string; groups: ChangeGroups; me: Me }) {
  const total = groups.new.length + groups.changed.length + groups.removed.length;
  const all = approveAllPlan(groups, me);
  const base = baselinePlan(groups);
  const [panel, setPanel] = useState<"none" | "approveAll" | "baseline">("none");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["new", "changed", "removed"] as const).map((s) => (
          <span key={s} className="rounded-md border border-border px-2 py-0.5">
            {COPY.status[s]} {groups[s].length}
          </span>
        ))}
        <span className="ml-auto flex flex-wrap gap-2">
          {all.count > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setPanel(panel === "approveAll" ? "none" : "approveAll")}>
              {COPY.approveAll(all.count, all.shared)}
            </Button>
          ) : null}
          {me.admin && base.records > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setPanel(panel === "baseline" ? "none" : "baseline")}>
              {COPY.baseline.button}
            </Button>
          ) : null}
        </span>
      </div>

      {panel === "approveAll" ? (
        <ConfirmPanel
          lead={COPY.approveAllLead(all.count, all.shared)}
          confirm={COPY.approveAllConfirm(all.count)}
          withNote
          run={async (note) => {
            const res = await decideChangesAction(all.routes, "approve", note);
            return res.ok ? COPY.recorded(res.recorded ?? all.count) : { error: res.error };
          }}
          onDone={(m) => { setPanel("none"); setMessage(m); }}
          onCancel={() => setPanel("none")}
        />
      ) : null}
      {panel === "baseline" ? (
        <ConfirmPanel
          lead={COPY.baseline.lead(base.records, base.shared, base.skipped)}
          confirm={COPY.baseline.confirm(base.records)}
          run={async () => {
            const res = await setBaselineAction(productType);
            return res.ok ? COPY.baseline.done(res.records, res.skipped) : { error: res.error };
          }}
          onDone={(m) => { setPanel("none"); setMessage(m); }}
          onCancel={() => setPanel("none")}
        />
      ) : null}
      {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}

      {total === 0 ? <p className="text-sm text-muted-foreground">{COPY.none}</p> : null}
      {(["new", "changed", "removed"] as const).map((s) =>
        groups[s].length === 0 ? null : (
          <section key={s} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {COPY.status[s]} <span className="font-normal text-muted-foreground">{groups[s].length}</span>
            </h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {groups[s].map((r, i) => {
                const heading = r.group && r.group !== groups[s][i - 1]?.group ? r.group : null;
                return (
                  <ChangeRowItem key={`${r.collection}/${r.sourceId}`} row={r} me={me} heading={heading} />
                );
              })}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

function ChangeRowItem({ row, me, heading }: { row: ChangeRow; me: Me; heading: string | null }) {
  const decidable = canDecideRow(row.route, me);
  const [open, setOpen] = useState(false);
  return (
    <li className="flex flex-col gap-2 px-3 py-2 text-sm">
      {heading ? <p className="-mx-3 -mt-2 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">{heading}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {row.recordHref ? (
          <Link href={row.recordHref} className="font-medium underline-offset-4 hover:underline">
            {row.label ?? row.sourceId}
          </Link>
        ) : (
          <span className="font-medium">{row.label ?? row.sourceId}</span>
        )}
        <span className="font-mono text-xs text-muted-foreground">{row.sourceId}</span>
        <span className="text-xs text-muted-foreground">{COPY.collection[row.collection]}</span>
        {row.sharedBy > 1 ? <Badge variant="outline" className="font-normal">{COPY.usedBy(row.sharedBy)}</Badge> : null}
        {row.edit ? <Badge variant="outline" className="font-normal">{COPY.proposal(row.edit)}</Badge> : null}
        {row.changesetItem ? <Badge variant="outline" className="font-normal">{COPY.held}</Badge> : null}
        <span className="ml-auto flex items-center gap-2">
          {decidable ? (
            <Button size="sm" variant={open ? "secondary" : "outline"} onClick={() => setOpen(!open)}>
              {open ? COPY.close : COPY.decide}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {!row.route ? COPY.noRoute : row.route.kind === "edit" ? COPY.adminDecides : COPY.readOnly}
            </span>
          )}
        </span>
      </div>
      {open && row.route ? <RowDecision route={row.route} onDone={() => setOpen(false)} /> : null}
    </li>
  );
}

export function RowDecision({ route, onDone }: { route: ChangeRoute; onDone?: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: LibraryDecision) {
    if (noteRequired(decision) && !note.trim()) {
      setError(ADMIN_SPEC_LIBRARY_COPY.noteNeeded);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await decideChangesAction([route], decision, note.trim() || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={ADMIN_SPEC_LIBRARY_COPY.notePlaceholder}
        aria-label={ADMIN_SPEC_LIBRARY_COPY.notePlaceholder}
        rows={1}
        maxLength={2000}
        disabled={pending}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide("approve")} disabled={pending}>
          {pending ? ADMIN_SPEC_LIBRARY_COPY.deciding : ADMIN_SPEC_LIBRARY_COPY.decisions.approve}
        </Button>
        <Button size="sm" variant="outline" onClick={() => decide("defer")} disabled={pending}>
          {ADMIN_SPEC_LIBRARY_COPY.decisions.defer}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => decide("reject")} disabled={pending}>
          {ADMIN_SPEC_LIBRARY_COPY.decisions.reject}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** An inline confirm step (no browser dialog): what will happen, an optional note, then confirm or cancel. */
function ConfirmPanel(props: {
  lead: string;
  confirm: string;
  withNote?: boolean;
  run: (note: string | null) => Promise<string | { error: string }>;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 text-sm">
      <p>{props.lead}</p>
      {props.withNote ? (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={COPY.noteOptional}
          aria-label={COPY.noteOptional}
          rows={1}
          maxLength={2000}
          disabled={pending}
        />
      ) : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const out = await props.run(note.trim() || null);
              if (typeof out !== "string") {
                setError(out.error);
                router.refresh();
                return;
              }
              props.onDone(out);
              router.refresh();
            })
          }
        >
          {pending ? ADMIN_SPEC_LIBRARY_COPY.deciding : props.confirm}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={props.onCancel}>
          {COPY.cancel}
        </Button>
      </div>
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    </div>
  );
}
