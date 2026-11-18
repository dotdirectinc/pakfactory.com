import type { CurrentRules } from "@/lib/spec/current-rules";

/** What the Needs attention tab lists: broken references, sibling/reference pairs, unknown dependencies, options that can never be offered. */
export function rulesAttentionCount(
  rules: Pick<CurrentRules, "attention" | "options">,
): number {
  const a = rules.attention;
  return (
    a.missingReferences.length +
    a.siblingPairs.length +
    a.referencePairs.length +
    a.unknownDependencyReferences.length +
    rules.options.filter((o) => o.unmetRequirements.length > 0).length
  );
}
