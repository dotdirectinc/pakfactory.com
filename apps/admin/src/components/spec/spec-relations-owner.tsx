"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { setRelationsOwnerAction } from "@/app/(admin)/spec/actions";
import type { RelationsOwner, RelationsOwnerValue } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_OWNER_COPY as COPY } from "@/lib/copy/spec";

/**
 * The relations-owner switch (PROD-2988 / PROD-3008): who edits the customization rules and a
 * registered record's parents — the Spec System (read-only in Studio) or Studio. One place to turn it
 * on and to revert it (Richard, 2026-10-16). Everyone with Spec access sees it; admins change it, after
 * an in-page confirmation.
 */
export function SpecRelationsOwner({ owner, canChange }: { owner: RelationsOwner; canChange: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rules, setRules] = useState<RelationsOwnerValue>(owner.rules);
  const [structure, setStructure] = useState<RelationsOwnerValue>(owner.structure);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = (v: RelationsOwnerValue) => (v === "spec" ? COPY.spec : COPY.studio);
  const unchanged = rules === owner.rules && structure === owner.structure;

  const cancel = () => {
    setEditing(false);
    setConfirming(false);
    setRules(owner.rules);
    setStructure(owner.structure);
  };

  const apply = () =>
    startTransition(async () => {
      const res = await setRelationsOwnerAction(owner.dataset, rules, structure, note);
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      setMessage({ tone: "ok", text: COPY.done });
      setEditing(false);
      setConfirming(false);
      setNote("");
      router.refresh();
    });

  const row = (title: string, value: RelationsOwnerValue, set: (v: RelationsOwnerValue) => void) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-foreground">{title}</span>
      {editing ? (
        <div role="radiogroup" aria-label={title} className="inline-flex overflow-hidden rounded-md border border-border">
          {(["spec", "studio"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              disabled={confirming}
              onClick={() => set(v)}
              className={`px-3 py-1 text-sm ${value === v ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              {label(v)}
            </button>
          ))}
        </div>
      ) : (
        <Badge variant={value === "spec" ? "default" : "secondary"}>{label(value)}</Badge>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">{COPY.title}</h2>
          <p className="max-w-3xl text-xs text-muted-foreground">{COPY.lead(owner.dataset)}</p>
        </div>
        {canChange && !editing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); setMessage(null); }}>
            {COPY.change}
          </Button>
        ) : null}
      </div>

      <div className="flex max-w-md flex-col gap-2">
        {row(COPY.rules, rules, setRules)}
        {row(COPY.structure, structure, setStructure)}
      </div>

      <p className="text-xs text-muted-foreground">
        {owner.source === "registry" && owner.updatedAt ? (
          <>
            {COPY.changed(owner.updatedByName ?? "—")} · <LocalTime iso={owner.updatedAt} />
          </>
        ) : (
          COPY.never
        )}
        {!canChange ? ` ${COPY.adminOnly}` : null}
      </p>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={COPY.note}
            maxLength={500}
            disabled={confirming}
            className="h-8 max-w-md rounded-md border border-border bg-background px-2 text-sm"
          />
          {confirming ? (
            <div role="alertdialog" aria-label={COPY.confirmTitle} className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
              <p className="text-sm font-medium text-foreground">{COPY.confirmTitle}</p>
              <p className="text-xs text-muted-foreground">{COPY.confirmBody(label(rules), label(structure))}</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={pending} onClick={apply}>
                  {pending ? COPY.saving : COPY.confirm}
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
                  {COPY.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={unchanged} onClick={() => setConfirming(true)}>
                {COPY.apply}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                {COPY.cancel}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"} className={`text-xs ${message.tone === "error" ? "text-destructive" : "text-foreground"}`}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
