import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCurrentRules } from "@/lib/spec/current-rules";
import { SpecRulesView } from "@/components/spec/spec-rules-view";
import { ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Current rules" };

export default async function SpecRulesPage() {
  // Same gate as the rest of /spec: 404 without a registry grant.
  await requireRegistryGrant();
  const res = await getCurrentRules();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {ADMIN_SPEC_RULES_COPY.title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{ADMIN_SPEC_RULES_COPY.lead}</p>
      </div>

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : (
        <SpecRulesView rules={res.data} />
      )}
    </div>
  );
}
