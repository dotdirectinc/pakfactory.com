"use client";

import { useRouter } from "next/navigation";
import type { TableGroup, TableKey } from "@/lib/spec/catalog-tables";

/** The level picker inside a group (top to bottom): navigates, so the table is loaded server-side. */
export function SpecCatalogLevelSelect({ group, level, label }: { group: TableGroup; level: TableKey; label: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-foreground"
        value={level}
        onChange={(e) => router.push(`/spec/catalog?group=${group.key}&level=${e.target.value}`)}
      >
        {group.levels.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
      </select>
    </label>
  );
}
