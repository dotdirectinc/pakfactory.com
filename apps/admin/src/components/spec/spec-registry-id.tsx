"use client";

import { useState } from "react";
import type { RegistryIdentity } from "@/lib/spec/rules-source";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY } from "@/lib/copy/spec";

/**
 * A record's registry identity (PROD-2628): the readable code, and the id it stands for, each
 * copyable. Read from Sanity, where the catalog fill writes what the registry minted.
 *
 * A product or inspiration product leads with its SKU (Richard, 2026-10-22): it is the number people
 * quote, so it comes first and stands out; the registry code follows, quieter.
 */
export function SpecRegistryId({ registry, sku }: { registry?: RegistryIdentity; sku?: string }) {
  const own = sku ?? registry?.sku;
  return (
    <dl className="flex flex-col gap-1 text-xs">
      {own ? (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-muted-foreground">{COPY.sku}</dt>
          <dd><CopyValue value={own} className="text-sm font-semibold text-foreground" /></dd>
        </div>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <dt className="text-muted-foreground">{COPY.registryId}</dt>
        {registry ? (
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <CopyValue value={registry.entityCode} className={own ? "text-muted-foreground" : "font-semibold text-foreground"} />
            <CopyValue value={registry.entityId} className="text-muted-foreground" />
          </dd>
        ) : <dd className="text-muted-foreground">{COPY.notRegistered}</dd>}
      </div>
    </dl>
  );
}

function CopyValue({ value, className }: { value: string; className: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard refused: the value is still selectable.
    }
  };
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-1">
      {/* break-all: the id is one long token, and must wrap in a narrow panel (2026-10-22). */}
      <code className={`select-all break-all font-mono ${className}`}>{value}</code>
      <button type="button" onClick={copy} className="text-muted-foreground hover:text-foreground hover:underline">
        {copied ? COPY.copied : COPY.copy}
      </button>
    </span>
  );
}
