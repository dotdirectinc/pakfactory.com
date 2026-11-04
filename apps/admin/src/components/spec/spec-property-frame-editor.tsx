"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@pakfactory/ui/components/radio-group";
import { propertyEditStateAction, savePropertyEditAction } from "@/app/(admin)/spec/actions";
import { SpecDecisionBar } from "@/components/spec/spec-decision-bar";
import { ADMIN_SPEC_MNEMONIC_KIND_COPY, ADMIN_SPEC_PROPERTY_EDIT_COPY as COPY } from "@/lib/copy/spec";
import type { MnemonicFrameKind, PropertyEditState, PropertyStream } from "@/lib/spec/registry-api";

type Props = {
  changesetId: string;
  /** property, line, solution or category (PROD-3170): only a property has a stream. */
  kind: MnemonicFrameKind;
  title: string;
  initial: PropertyEditState;
  itemCount: number;
  canEdit: boolean;
  blockedBy: string[];
};

const MNEMONIC = /^[A-Z]{3}$/;

/**
 * A new property's Register frame (PROD-3169). The mnemonic its values' codes carry and the stream its own
 * code names are proposed by Sync Changes; the reviewer may change either before approving. Shared and
 * saved, no lock: the page reads the frame every 3 s while it is visible and pending, and Approve sends the
 * revision on screen — the server refuses a stale one, and mints the code with what was approved.
 *
 * A new line, solution or customization category's Register frame (PROD-3170) is the same without a stream.
 */
export function SpecPropertyFrameEditor({ changesetId, kind, title, initial, itemCount, canEdit, blockedBy }: Props) {
  const K = ADMIN_SPEC_MNEMONIC_KIND_COPY[kind];
  const router = useRouter();
  const [edit, setEdit] = useState(initial);
  const [mnemonic, setMnemonic] = useState(initial.mnemonic ?? "");
  // While the box differs from the saved value, polling must not overwrite what is being typed.
  const typing = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft = edit.state === "draft";
  const editable = draft && canEdit;
  const wasDraft = useRef(draft);
  const mnemonicId = useId();
  const streamId = useId();

  const apply = useCallback((next: PropertyEditState) => {
    setEdit(next);
    if (!typing.current) setMnemonic(next.mnemonic ?? "");
    if (next.replacedBy) { wasDraft.current = false; router.replace(`/spec/${next.replacedBy}`); return; }
    if (wasDraft.current && next.state !== "draft") router.refresh();
    wasDraft.current = next.state === "draft";
  }, [router]);

  const poll = useCallback(async () => {
    const res = await propertyEditStateAction(changesetId);
    if (res.ok) apply(res.data);
  }, [changesetId, apply]);

  useEffect(() => {
    if (!draft) return;
    const tick = () => { if (document.visibilityState === "visible") void poll(); };
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [draft, poll]);

  const save = async (change: { mnemonic?: string; stream?: PropertyStream }) => {
    setSaving(true);
    setError(null);
    const res = await savePropertyEditAction(changesetId, change);
    setSaving(false);
    if (!res.ok) { setError(COPY.saveFailed(res.error)); return; }
    typing.current = false;
    await poll();
  };

  const typed = mnemonic.trim().toUpperCase();
  const typedValid = MNEMONIC.test(typed);
  const unsaved = typed !== (edit.mnemonic ?? "");
  const decided = edit.state === "approved" && edit.approvedBy ? COPY.approvedBy(edit.approvedBy)
    : edit.state === "discarded" && edit.discardedBy ? COPY.discardedBy(edit.discardedBy) : null;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{decided ?? (edit.replacedBy ? COPY.replaced : "")}</div>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">{K.heading} · {title}</h2>
        {editable ? <p className="text-sm text-muted-foreground">{K.lead}</p> : null}
        {draft && !canEdit ? <p className="text-sm text-muted-foreground">{COPY.readOnly}</p> : null}
        {edit.editedBy && edit.editedAt ? (
          <p className="text-xs text-muted-foreground">{COPY.editedBy(edit.editedBy, new Date(edit.editedAt).toLocaleTimeString())}</p>
        ) : null}
      </div>

      {edit.replacedBy ? (
        <p className="text-sm text-muted-foreground">
          {COPY.replaced}{" "}
          <Link href={`/spec/${edit.replacedBy}`} className="font-medium text-foreground underline underline-offset-2">{COPY.openReplacement}</Link>
        </p>
      ) : null}

      {edit.state === "approved" && edit.code && edit.mnemonic ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">{COPY.registeredAs(edit.code, edit.mnemonic)}</p>
          <p className="text-sm text-muted-foreground">{K.next}</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${edit.streams.length ? "sm:grid-cols-2" : ""}`}>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => { e.preventDefault(); if (editable && typedValid && unsaved) void save({ mnemonic: typed }); }}
          >
            <Label htmlFor={mnemonicId}>{COPY.mnemonic}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={mnemonicId}
                value={mnemonic}
                maxLength={3}
                disabled={!editable || saving}
                aria-invalid={!!edit.problem || (unsaved && !typedValid) || undefined}
                aria-describedby={`${mnemonicId}-help`}
                className="w-24 font-mono uppercase"
                onChange={(e) => { typing.current = true; setMnemonic(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")); }}
              />
              {editable ? (
                <Button type="submit" size="sm" variant="outline" disabled={!typedValid || !unsaved || saving}>
                  {saving ? COPY.saving : COPY.save}
                </Button>
              ) : null}
            </div>
            <p id={`${mnemonicId}-help`} className="text-xs text-muted-foreground">
              {K.mnemonicHelp} {edit.proposed.mnemonic !== edit.mnemonic ? COPY.proposed(edit.proposed.mnemonic) : null}
            </p>
            {unsaved && typed && !typedValid ? <p className="text-sm text-destructive">{COPY.notThreeLetters}</p> : null}
            {!unsaved && edit.problem ? <p role="alert" className="text-sm text-destructive">⚠ {edit.problem}</p> : null}
          </form>

          {edit.streams.length ? <div className="flex flex-col gap-2">
            <Label id={streamId}>{COPY.stream}</Label>
            <RadioGroup
              aria-labelledby={streamId}
              value={edit.stream ?? undefined}
              disabled={!editable || saving}
              onValueChange={(v) => { if (v !== edit.stream) void save({ stream: v as PropertyStream }); }}
            >
              {edit.streams.map((s) => (
                <div key={s} className="flex items-start gap-2">
                  <RadioGroupItem id={`${streamId}-${s}`} value={s} className="mt-0.5" />
                  <Label htmlFor={`${streamId}-${s}`} className="flex flex-col items-start gap-0 font-normal">
                    <span className="text-sm text-foreground">{COPY.streams[s].label}</span>
                    <span className="text-xs text-muted-foreground">{COPY.streams[s].help}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">{COPY.streamHelp}</p>
          </div> : null}
        </div>
      )}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {decided ? <p className="text-sm text-muted-foreground">{decided}</p> : null}

      {/* Approve sends what is saved: say so when the box holds something else. The server refuses a
          mnemonic in use, shown above. */}
      {editable && unsaved && typed ? <p className="text-sm text-foreground">⚠ {COPY.unsaved(edit.mnemonic ?? "—")}</p> : null}
      {draft ? (
        <SpecDecisionBar
          changesetId={changesetId}
          itemCount={itemCount}
          writesToSanity
          canDecide={canEdit}
          blockedBy={blockedBy}
          revision={edit.revision}
          onRefused={() => void poll()}
        />
      ) : null}
    </section>
  );
}
