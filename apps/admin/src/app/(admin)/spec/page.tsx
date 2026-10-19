import { Suspense } from "react";
import Link from "next/link";
import { getRelationsOwner, listChangesetsPage } from "@/lib/spec/registry-api";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { SpecEditHistory } from "@/components/spec/spec-edit-history";
import { SpecRelationsOwner } from "@/components/spec/spec-relations-owner";
import { ADMIN_SPEC_COPY, ADMIN_SPEC_REGISTRY_COPY as COPY } from "@/lib/copy/spec";
import { SectionSkeleton } from "@/components/ui/page-skeleton";
import {
  AttentionSection,
  RecentSection,
  Section,
  SyncControlSection,
  WaitingSection,
} from "@/components/spec/registry/registry-sections";
import { RegistryTabLink } from "@/components/spec/registry/registry-tab-link";

export const metadata = { title: "Spec registry" };

const VIEWS = ["overview", "history", "settings"] as const;
type View = (typeof VIEWS)[number];
const HISTORY_PAGE = 15;

/**
 * The Spec registry (PROD-3115). Overview first — what is waiting, what needs attention, what happened
 * lately — each section loading on its own. Edit history and Settings are tabs, read only when opened.
 */
// Each tab's sections are keyed by the tab: switching tabs mounts new boundaries, so their loading
// placeholders show at once instead of the old tab staying on screen until the new one arrives.
export default async function SpecPage({ searchParams }: { searchParams: Promise<{ view?: string; n?: string }> }) {
  // 404s staff without a grant before anything is fetched or rendered.
  const me = await requireRegistryGrant();
  const sp = await searchParams;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "overview";
  const canSync = me.capabilities.includes("catalog.sync");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{ADMIN_SPEC_COPY.listTitle}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">{COPY.lead}</p>
        </div>
        <Suspense fallback={null}>
          <SyncControlSection canSync={canSync} />
        </Suspense>
      </header>

      <nav aria-label={ADMIN_SPEC_COPY.listTitle} className="flex gap-1 border-b border-border">
        {VIEWS.map((v) => (
          <RegistryTabLink key={v} href={v === "overview" ? "/spec" : `/spec?view=${v}`} current={v === view}>
            {COPY.tabs[v]}
          </RegistryTabLink>
        ))}
      </nav>

      {view === "overview" ? (
        <div className="flex flex-col gap-6">
          <Suspense key="waiting" fallback={<Section title={COPY.waitingTitle}><SectionSkeleton rows={2} label={COPY.loadingWaiting} /></Section>}>
            <WaitingSection />
          </Suspense>
          <Suspense fallback={null}>
            <AttentionSection canSync={canSync} />
          </Suspense>
          <Suspense key="recent" fallback={<Section title={COPY.recentTitle}><SectionSkeleton rows={3} label={COPY.loadingRecent} /></Section>}>
            <RecentSection />
          </Suspense>
        </div>
      ) : null}

      {view === "history" ? (
        <Suspense key={`history-${sp.n ?? ""}`} fallback={<SectionSkeleton rows={6} label={COPY.loadingHistory} />}>
          <HistoryView limit={Math.min(Math.max(Number(sp.n) || HISTORY_PAGE, HISTORY_PAGE), 200)} />
        </Suspense>
      ) : null}

      {view === "settings" ? (
        <Suspense key="settings" fallback={<SectionSkeleton rows={3} label={COPY.loadingSettings} />}>
          <SettingsView canChange={me.capabilities.includes("relations.owner")} />
        </Suspense>
      ) : null}
    </div>
  );
}

/** Spec System edits, newest first, a page at a time ("Show more" asks for the next page too). */
async function HistoryView({ limit }: { limit: number }) {
  const res = await listChangesetsPage({ source: "spec-edit", limit: limit + 1 });
  if (!res.ok) return <p role="alert" className="text-sm text-destructive">{COPY.sectionError(ADMIN_SPEC_COPY.editsTitle)} ({res.error})</p>;
  const more = res.data.length > limit;
  return (
    <div className="flex flex-col gap-3">
      <SpecEditHistory changesets={res.data} limit={limit} />
      {res.data.length === 0 ? <p className="text-sm text-muted-foreground">{ADMIN_SPEC_COPY.empty}</p> : null}
      {more ? (
        <Link href={`/spec?view=history&n=${limit + HISTORY_PAGE}`} scroll={false} className="self-start text-sm font-medium text-primary hover:underline">
          {COPY.historyMore}
        </Link>
      ) : null}
    </div>
  );
}

/** Who edits the relations (PROD-2988 / PROD-3008). Development only, like Sync Changes (production: PROD-2963). */
async function SettingsView({ canChange }: { canChange: boolean }) {
  const owner = await getRelationsOwner("development");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{COPY.settingsLead}</p>
      {owner.ok ? (
        <SpecRelationsOwner owner={owner.data} canChange={canChange} />
      ) : (
        <p role="alert" className="text-sm text-destructive">{COPY.sectionError(COPY.tabs.settings)} ({owner.error})</p>
      )}
    </div>
  );
}
