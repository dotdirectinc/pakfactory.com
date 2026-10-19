"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { dismissSyncAction } from "@/app/(admin)/spec/actions";
import { ADMIN_SPEC_SYNC_COPY as COPY } from "@/lib/copy/spec";

/** Hide a failed sync from "Needs attention"; the run itself is kept (2026-10-06). */
export function RegistryDismissButton({ runId }: { runId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await dismissSyncAction(runId);
            if (!res.ok) setError(res.error);
            router.refresh();
          })
        }
      >
        {pending ? COPY.dismissing : COPY.dismiss}
      </Button>
      {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
