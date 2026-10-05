import { listAllChangesets, listSyncRuns } from "@/lib/spec/registry-api";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { SpecChangesetTable } from "@/components/spec/spec-changeset-table";
import { SpecSyncPanel } from "@/components/spec/spec-sync-panel";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Spec registry" };

export default async function SpecPage() {
  // 404s staff without a grant before anything is fetched or rendered.
  const me = await requireRegistryGrant();
  const [res, runs] = await Promise.all([listAllChangesets(), listSyncRuns()]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {ADMIN_SPEC_COPY.listTitle}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{ADMIN_SPEC_COPY.listLead}</p>
      </div>

      {/* A backend without sync runs (not yet deployed) hides the panel rather than failing the page. */}
      {runs.ok ? <SpecSyncPanel runs={runs.data} canSync={me.capabilities.includes("catalog.sync")} /> : null}

      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_COPY.unreachable} ({res.error})
        </p>
      ) : res.data.filter((c) => c.state === "draft").length === 0 ? (
        <div className="rounded-md border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium text-foreground">{ADMIN_SPEC_COPY.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ADMIN_SPEC_COPY.emptyHint}</p>
        </div>
      ) : (
        <SpecChangesetTable
          changesets={res.data.filter((c) => c.state === "draft")}
          all={res.data}
        />
      )}
    </div>
  );
}
