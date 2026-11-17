import { RefChip, SpecValue } from "@/components/spec/library/spec-value";
import { ruleConditions, ruleOutcomes, type SpecRefs } from "@/lib/spec/library-display";

/**
 * A rule's logic as sentences (PLAT-81): "When all of these are true: Recycled board (CAP-MAT-CCNB)
 * is selected · Use (FLD-GEN-USE) is Food (indirect contact)", then what the rule asks for.
 * Anything the shape does not cover still shows, as its raw value.
 */
export function RuleLogic({ body, refs }: { body: unknown; refs?: SpecRefs }) {
  const when = ruleConditions(body);
  const outcomes = ruleOutcomes(body);
  if (!when && outcomes.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 text-sm">
      {when && when.conditions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium">When {when.conditions.length === 1 ? "" : `${when.match} of these are true`}</p>
          <ol className="flex flex-col gap-2">
            {when.conditions.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {when.conditions.length > 1 ? (
                  <span className="w-12 shrink-0 text-xs uppercase text-muted-foreground">{i === 0 ? "if" : when.match === "all" ? "and" : "or"}</span>
                ) : null}
                {typeof c.subject === "string" ? <RefChip value={c.subject} refs={refs} /> : <SpecValue value={c.subject} refs={refs} />}
                <span className="text-muted-foreground">{c.op}</span>
                {c.showValue ? <SpecValue value={c.value} refs={refs} /> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {outcomes.map(([label, v]) => (
        <div key={label} className="flex flex-col gap-2">
          <p className="font-medium">{label}</p>
          <SpecValue value={v} refs={refs} />
        </div>
      ))}
    </div>
  );
}
