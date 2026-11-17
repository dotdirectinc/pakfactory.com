"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { decideLibraryChangeAction } from "@/app/(admin)/spec/library/actions";
import { noteRequired } from "@/lib/spec/library-review";
import type { LibraryDecision } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

/**
 * Decide one held change (PLAT-81). Approve applies the exported values to the approved record;
 * reject keeps the approved values; defer leaves it to the next import. Reject and defer need a note.
 * Approve and reject are final, so the database refuses a second decision (shown as the error).
 */
export function LibraryChangeDecision({ item }: { item: number }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: LibraryDecision) {
    if (noteRequired(decision) && !note.trim()) {
      setError(COPY.noteNeeded);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await decideLibraryChangeAction(item, decision, note.trim() || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={COPY.notePlaceholder}
        rows={2}
        maxLength={2000}
        disabled={pending}
        aria-label={COPY.notePlaceholder}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => decide("approve")} disabled={pending}>
          {pending ? COPY.deciding : COPY.decisions.approve}
        </Button>
        <Button size="sm" variant="outline" onClick={() => decide("defer")} disabled={pending}>
          {COPY.decisions.defer}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => decide("reject")} disabled={pending}>
          {COPY.decisions.reject}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
