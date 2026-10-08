"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@pakfactory/ui/components/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pakfactory/ui/components/select";
import type { TableGroup, TableKey } from "@/lib/spec/catalog-tables";
import { ADMIN_SPEC_TABLES_COPY as COPY } from "@/lib/copy/spec";

/**
 * Catalog tables navigation (PROD-2926): the three streams as tabs, the level inside a stream as a
 * select, top to bottom. Both navigate, so each table is loaded and cached on the server.
 */
export function SpecCatalogNav({ groups, group, level }: { groups: TableGroup[]; group: TableGroup; level: TableKey }) {
  const router = useRouter();
  const go = (g: string, l?: string) => router.push(`/spec/catalog?group=${g}${l ? `&level=${l}` : ""}`);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
      <Tabs value={group.key} onValueChange={(v) => go(v)}>
        <TabsList variant="line">
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-2 pb-2">
        <span className="text-sm text-muted-foreground">{COPY.level}</span>
        <Select value={level} onValueChange={(v) => go(group.key, v)}>
          <SelectTrigger size="sm" className="w-64" aria-label={COPY.level}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {group.levels.map((l) => (
              <SelectItem key={l.key} value={l.key}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
