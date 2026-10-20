import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCurrentRules } from "@/lib/spec/current-rules";
import { SpecRulesView } from "@/components/spec/spec-rules-view";
import { SpecFutureAction } from "@/components/spec/spec-future-action";
import { ADMIN_SPEC_FUTURE_COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";
import { PageLead } from "@/components/ui/page-lead";

export const metadata = { title: "Spec rules" };

export default async function SpecRulesPage() {
  // Same gate as the rest of /spec: 404 without a registry grant.
  // Access check and data load together (PROD-3116); the data is only rendered once the check passes.
  const [, res] = await Promise.all([requireRegistryGrant(), getCurrentRules()]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {ADMIN_SPEC_RULES_COPY.title}
          </h1>
          <PageLead className="max-w-2xl">{ADMIN_SPEC_RULES_COPY.lead}</PageLead>
        </div>
        <SpecFutureAction label={ADMIN_SPEC_FUTURE_COPY.addRule} />
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
