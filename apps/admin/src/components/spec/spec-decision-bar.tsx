"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { decideFrameAction } from "@/app/(admin)/spec/actions";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";

type Props = {
  changesetId: string;
  itemCount: number;
  canDecide: boolean;
  /** Frames that must be approved before this one. Empty when it is ready. */
  blockedBy: string[];
};

/**
 * Approving is irreversible and applies every item in the frame at once, so the
 * button says how many rows go live and asks once. There is no undo to offer
 * afterwards — a changeset is applied or discarded as a whole, and the reverse of
 * an approval is a new changeset, not a button.
 */
export function SpecDecisionBar({ changesetId, itemCount, canDecide, blockedBy }: Props) {
  const [pending, startTransition] = useTransition();
  const [isDeciding, setIsDeciding] = useState<null | "approve" | "discard">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<null | "approve" | "discard">(null);
  const router = useRouter();

  if (!canDecide) {
    return <p className="text-sm text-muted-foreground">{ADMIN_SPEC_COPY.readOnlyNote}</p>;
  }

  // Approving out of order fails on a foreign key and rolls back — harmless, but the
  // reviewer would learn the order by hitting it. Discard stays available: it writes
  // nothing, so nothing depends on it.
  if (blockedBy.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
          {ADMIN_SPEC_COPY.blockedLead}{" "}
          <strong className="font-medium">{blockedBy.join(", ")}</strong>.
        </p>
        <div className="flex items-center gap-2">
          {confirming === "discard" ? (
            <>
              <span className="text-sm text-foreground">{ADMIN_SPEC_COPY.discardConfirm}</span>
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => decide("discard")}>
                {isDeciding === "discard" ? ADMIN_SPEC_COPY.discarding : ADMIN_SPEC_COPY.discardYes}
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
                Cancel
              </Button>
            </>
          ) : (
            // Quiet, and never the only thing on the screen: when Approve is unavailable a
            // prominent Discard is the only button left, which reads as the way forward.
            // It is the opposite — it throws the frame away.
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming("discard")}>
              {ADMIN_SPEC_COPY.discard}
            </Button>
          )}
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  function decide(decision: "approve" | "discard") {
    setError(null);
    setIsDeciding(decision);
    startTransition(async () => {
      const res = await decideFrameAction(changesetId, decision);
      setIsDeciding(null);
      setConfirming(null);
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
        {confirming === "approve" ? (
          <>
            <span className="text-sm text-foreground">
              Approve {itemCount.toLocaleString()} changes? This cannot be undone.
            </span>
            <Button size="sm" disabled={pending} onClick={() => decide("approve")}>
              {isDeciding === "approve" ? ADMIN_SPEC_COPY.approving : "Yes, approve"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : confirming === "discard" ? (
          <>
            <span className="text-sm text-foreground">{ADMIN_SPEC_COPY.discardConfirm}</span>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => decide("discard")}>
              {isDeciding === "discard" ? ADMIN_SPEC_COPY.discarding : ADMIN_SPEC_COPY.discardYes}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={pending} onClick={() => setConfirming("approve")}>
              {ADMIN_SPEC_COPY.approve}
            </Button>
            {/* Ghost, not outline: discarding throws away a generated frame, and it should
                never look like the neighbouring, ordinary alternative to approving. */}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming("discard")}>
              {ADMIN_SPEC_COPY.discard}
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
