"use server";

import { revalidatePath } from "next/cache";
import {
  editSpecMap, editSpecRecord, getSpecCollectionOwners, getSpecMapProduction, listLibraryItems, listLibraryVersions,
  type SpecMapEditResult,
} from "@/lib/spec/registry-api";
import type { MapDoc, MapDocPreset, MapDocTarget, Ref, RefKind } from "@/lib/spec/map-editor";
import { LIBRARY_COLLECTION } from "@/lib/spec/map-editor";
import type { EditorResult } from "@/app/(admin)/spec/library/editor-actions";

/**
 * The map editor's reads and writes (PLAT-86). Server actions so the access token stays on the
 * server. The backend checks `spec.edit`; the database applies or holds the edit and refuses a save
 * started from an older revision (409).
 */

function fail(res: { status: number; error: string; fields?: Record<string, string> }): EditorResult<never> {
  return { ok: false, error: res.error, fields: res.fields, stale: res.status === 409 };
}

export type MapEditorData = { doc: MapDoc; addable: { productTypes: boolean; capabilities: boolean } };

/** The stored map, and whether + Add new can create records (only in collections the Spec System owns). */
export async function loadMapAction(map: number): Promise<EditorResult<MapEditorData>> {
  const [doc, owners] = await Promise.all([getSpecMapProduction(map), getSpecCollectionOwners()]);
  if (!doc.ok) return fail(doc);
  const own = owners.ok ? owners.data : null;
  return {
    ok: true,
    data: {
      doc: doc.data,
      addable: { productTypes: own?.productTypes === "spec_system", capabilities: own?.capabilities === "spec_system" },
    },
  };
}

/** Records of one line for a picker: the latest library version, retired records left out by the API. */
export async function searchRecordsAction(kind: RefKind | "group", line: string, search: string): Promise<EditorResult<Ref[]>> {
  const versions = await listLibraryVersions(line);
  if (!versions.ok) return fail(versions);
  const v = versions.data[0];
  if (!v) return { ok: true, data: [] };
  const collection = kind === "group" ? "capability_group" : LIBRARY_COLLECTION[kind];
  const res = await listLibraryItems(v.number, { collection, line, search: search.trim() || undefined, limit: 30, offset: 0 });
  if (!res.ok) return fail(res);
  return {
    ok: true,
    data: res.data.items.map((i) => ({ kind: kind === "group" ? "capability" : kind, sourceId: i.sourceId, name: i.label })),
  };
}

export async function saveMapAction(
  map: number,
  production: { targets: MapDocTarget[]; presets: MapDocPreset[] },
  baseRevision: number,
  note: string | null,
): Promise<EditorResult<SpecMapEditResult>> {
  const res = await editSpecMap(map, { production, baseRevision, note });
  if (!res.ok) return fail(res);
  revalidatePath("/spec/mapping");
  revalidatePath("/spec/library", "layout");
  return { ok: true, data: res.data };
}

/**
 * + Add new: create a product type or capability from a map. The database saves it but never
 * approves it, even for an admin: it is listed as new under Review → Production library until an
 * admin approves it there (ADR-028 D8).
 */
export async function createViaMapAction(
  collection: "productTypes" | "capabilities",
  record: Record<string, unknown> & { id: string },
  map: number,
): Promise<EditorResult<{ sourceId: string; mode: string }>> {
  const res = await editSpecRecord(collection, record.id, { action: "create", record, viaMap: map, note: `Added from map ${map}` });
  if (!res.ok) return fail(res);
  revalidatePath("/spec/library", "layout");
  return { ok: true, data: { sourceId: res.data.sourceId, mode: res.data.mode } };
}
