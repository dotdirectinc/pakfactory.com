"use server";

import { revalidatePath } from "next/cache";
import {
  confirmCapabilityRemoval, editSpecRecord, getSpecRecord, previewCapabilityRemoval, suggestSpecSourceId,
  type RemovalFrom, type RemovalPreview, type SpecCollection, type SpecEditAction, type SpecEditResult, type SpecRecordState,
} from "@/lib/spec/registry-api";

/**
 * The product type editor's writes (PLAT-85 scope 4–5). Server actions so the access token stays on
 * the server. The backend checks `spec.edit` and the library; the database applies an admin's edit or
 * holds it as a proposal, and refuses a save started from an older revision.
 */

export type EditorResult<T> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string>; stale?: boolean };

function fail(res: { status: number; error: string; fields?: Record<string, string> }): EditorResult<never> {
  return { ok: false, error: res.error, fields: res.fields, stale: res.status === 409 };
}

export async function loadSpecRecordAction(collection: SpecCollection, sourceId: string): Promise<EditorResult<SpecRecordState>> {
  const res = await getSpecRecord(collection, sourceId);
  return res.ok ? { ok: true, data: res.data } : fail(res);
}

export async function saveSpecRecordAction(
  collection: SpecCollection,
  sourceId: string,
  body: { action: SpecEditAction; record?: Record<string, unknown>; baseRevision?: number | null; note?: string | null },
): Promise<EditorResult<SpecEditResult>> {
  const res = await editSpecRecord(collection, sourceId, body);
  if (!res.ok) return fail(res);
  revalidatePath("/spec/library", "layout");
  return { ok: true, data: res.data };
}

export async function suggestIdAction(collection: SpecCollection, parts: string[]): Promise<EditorResult<string>> {
  const res = await suggestSpecSourceId(collection, parts);
  return res.ok ? { ok: true, data: res.data.sourceId } : fail(res);
}

export async function previewRemovalAction(capability: string, from: RemovalFrom): Promise<EditorResult<RemovalPreview>> {
  const res = await previewCapabilityRemoval(capability, from);
  return res.ok ? { ok: true, data: res.data } : fail(res);
}

export async function confirmRemovalAction(
  capability: string,
  from: RemovalFrom,
  baseRevision: number | null,
  note: string | null,
): Promise<EditorResult<SpecEditResult>> {
  const res = await confirmCapabilityRemoval(capability, from, baseRevision, note);
  if (!res.ok) return fail(res);
  revalidatePath("/spec/library", "layout");
  return { ok: true, data: res.data };
}
