import { Plus } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { ADMIN_SPEC_FUTURE_COPY as COPY } from "@/lib/copy/spec";

/**
 * A planned action shown greyed out, so people can see what is coming (Richard, 2026-10-15:
 * "Add a new rule" / "Add a new {entity}" are phase 2). It does nothing; the tag says why.
 */
export function SpecFutureAction({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2" title={COPY.title}>
      <Button type="button" variant="outline" size="sm" disabled aria-describedby="spec-future-note" className="gap-1.5">
        <Plus className="size-4" aria-hidden />
        {label}
      </Button>
      <Badge id="spec-future-note" variant="secondary">{COPY.tag}</Badge>
    </span>
  );
}
