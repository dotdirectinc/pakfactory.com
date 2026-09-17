"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { decideFrameAction } from "@/app/(admin)/spec/actions";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";

type Props = { changesetId: string; itemCount: number; canDecide: boolean };

/**
 * Approving is irreversible and applies every item in the frame at once, so the
 * button says how many rows go live and asks once. There is no undo to offer
 * afterwards — a changeset is applied or discarded as a whole, and the reverse of
 * an approval is a new changeset, not a button.
 */
export function SpecDecisionBar({ changesetId, itemCount, canDecide }: Props) {
  const [pending, startTransition] = useTransition();
  const [isDeciding, setIsDeciding] = useState<null | "approve" | "discard">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (!canDecide) {
    return <p className="text-sm text-muted-foreground">{ADMIN_SPEC_COPY.readOnlyNote}</p>;
  }

  function decide(decision: "approve" | "discard") {
    setError(null);
    setIsDeciding(decision);
    startTransition(async () => {
      const res = await decideFrameAction(changesetId, decision);
      setIsDeciding(null);
      setConfirming(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-foreground">
              Approve {itemCount.toLocaleString()} changes? This cannot be undone.
            </span>
            <Button size="sm" disabled={pending} onClick={() => decide("approve")}>
              {isDeciding === "approve" ? ADMIN_SPEC_COPY.approving : "Yes, approve"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={pending} onClick={() => setConfirming(true)}>
              {ADMIN_SPEC_COPY.approve}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("discard")}>
              {isDeciding === "discard" ? ADMIN_SPEC_COPY.discarding : ADMIN_SPEC_COPY.discard}
            </Button>
          </>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
