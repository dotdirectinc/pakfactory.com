import Link from "next/link";
import { getCurrentRules } from "@/lib/spec/current-rules";
import { rulesAttentionCount } from "@/lib/spec/rules-attention";
import { ADMIN_SPEC_RULES_HEALTH_COPY as COPY } from "@/lib/copy/spec";

/**
 * Website specs → the compatibility rules (Richard, 2026-11-18). Rules belong to records — they are
 * edited on a record's page or on the map — so the overview is not a menu entry or a view of its own:
 * one line under the Table | Map tabs gives their health and opens it. Needs attention links straight
 * to that tab. Rules unreadable: no line (the overview itself says why).
 */
export async function RulesHealthLine() {
  const res = await getCurrentRules();
  if (!res.ok) return null;
  const attention = rulesAttentionCount(res.data);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <Link
        href="/spec/rules"
        title={COPY.open}
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        {COPY.label} →
      </Link>
      <span>{COPY.pairs(res.data.totals.pairs)}</span>
      <span aria-hidden>·</span>
      <Link
        href="/spec/rules?tab=exceptions"
        className="underline-offset-2 hover:underline"
      >
        {COPY.exceptions(res.data.totals.exceptions)}
      </Link>
      {attention > 0 ? (
        <>
          <span aria-hidden>·</span>
          <Link
            href="/spec/rules?tab=attention"
            className="text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
          >
            ⚠ {COPY.attention(attention)}
          </Link>
        </>
      ) : null}
    </p>
  );
}
