"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { approveLibraryVersionAction } from "@/app/(admin)/spec/library/actions";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

/**
 * Approve a Spec Library version (PFP-124 AC 3). Offered only when nothing is pending or deferred;
 * the backend checks again. Irreversible, so it asks once, in place.
 */
export function LibraryApproveVersion({ version, open }: { version: number; open: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (open > 0) return <p className="text-sm text-muted-foreground">{COPY.approveVersionBlocked}</p>;

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveLibraryVersionAction(version);
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm">{COPY.approveVersionConfirm(version)}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={approve} disabled={pending}>
              {pending ? COPY.approving : COPY.confirm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirming(true)}>
          {COPY.approveVersion}
        </Button>
      )}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
