"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { decideLibraryAction } from "@/app/(admin)/spec/library/actions";
import { noteRequired } from "@/lib/spec/library-review";
import type { LibraryDecision } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

type Props = {
  version: number;
  items: { collection: string; sourceId: string }[];
  /** Called after a decision is recorded (the list clears its selection). */
  onDone?: () => void;
  compact?: boolean;
  /**
   * The record's latest decision, on a single-record form. Its button is disabled: repeating the
   * decision adds a duplicate history entry and changes nothing. The other two stay available.
   */
  current?: LibraryDecision | null;
};

/**
 * Approve, reject or defer the given records with one note (PFP-124). A reject or defer needs a note:
 * the button asks for it here, and the backend refuses one without. Decisions are append-only, so
 * changing one later is just another decision — no confirm step.
 */
export function LibraryDecisionForm({ version, items, onDone, compact = false, current = null }: Props) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: LibraryDecision) {
    setMessage(null);
    if (decision === current) return;
    if (noteRequired(decision) && !note.trim()) {
      setError(COPY.noteNeeded);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await decideLibraryAction(version, decision, note.trim() || null, items);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      setMessage(COPY.recorded(res.recorded ?? items.length, COPY.decisions[decision]!));
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={COPY.notePlaceholder}
        rows={compact ? 1 : 3}
        maxLength={2000}
        disabled={pending}
        aria-label={COPY.notePlaceholder}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => decide("approve")} disabled={pending || items.length === 0 || current === "approve"}>
          {pending ? COPY.deciding : COPY.decisions.approve}
        </Button>
        <Button size="sm" variant="outline" onClick={() => decide("defer")} disabled={pending || items.length === 0 || current === "defer"}>
          {COPY.decisions.defer}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => decide("reject")} disabled={pending || items.length === 0 || current === "reject"}>
          {COPY.decisions.reject}
        </Button>
        {message ? <span role="status" className="text-sm text-muted-foreground">{message}</span> : null}
      </div>
      {current ? <p className="text-sm text-muted-foreground">{COPY.currentDecision(COPY.states[current]!.toLowerCase())}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
