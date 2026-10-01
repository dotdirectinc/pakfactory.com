"use client";

import { useState } from "react";
import type { RegistryIdentity } from "@/lib/spec/rules-source";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY } from "@/lib/copy/spec";

/**
 * A record's registry identity (PROD-2628): the readable code, and the id it stands for, each
 * copyable. Read from Sanity, where the catalog fill writes what the registry minted.
 */
export function SpecRegistryId({ registry }: { registry?: RegistryIdentity }) {
  if (!registry) {
    return <p className="text-xs text-muted-foreground">{COPY.registryId}: {COPY.notRegistered}</p>;
  }
  return (
    <dl className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
      <dt className="text-muted-foreground">{COPY.registryId}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <CopyValue value={registry.entityCode} className="font-semibold text-foreground" />
        <CopyValue value={registry.entityId} className="text-muted-foreground" />
      </dd>
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
    <span className="inline-flex items-baseline gap-1">
      <code className={`select-all font-mono ${className}`}>{value}</code>
      <button type="button" onClick={copy} className="text-muted-foreground hover:text-foreground hover:underline">
        {copied ? COPY.copied : COPY.copy}
      </button>
    </span>
  );
}
