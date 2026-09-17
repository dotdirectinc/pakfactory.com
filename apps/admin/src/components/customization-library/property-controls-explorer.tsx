"use client";

import { AdminPageContainer } from "@/components/layout/admin-page-container";
import { CatalogSection } from "./catalog-section";
import { RulesSection } from "./rules-section";
import { SandboxSection } from "./sandbox-section";

/**
 * Draft explorer: catalog + sandbox + rules.
 * Page title lives in AdminPageHeader on the route.
 */
export function PropertyControlsExplorer() {
  return (
    <div className="text-sm text-foreground">
      <AdminPageContainer className="pb-20">
        <CatalogSection />
        <SandboxSection />
        <RulesSection />

        <div className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
          Draft build spec · categories &amp; options revised 2026-09-04 ·
          previews are illustrative; conditions are provisional and marked for
          the specialist to confirm. The product list in the sandbox is
          assembled from products named in the conditions and is{" "}
          <b className="text-foreground">not</b> the real hierarchy — replace
          it once Line / Style / Product is settled. Pairs with the{" "}
          <b className="text-foreground">Customization Build Spec</b>{" "}
          spreadsheet (same content, cell-fillable). Static HTML reference
          remains at <code>/customization-logic-explorer.html</code>.
        </div>
      </AdminPageContainer>
    </div>
  );
}
