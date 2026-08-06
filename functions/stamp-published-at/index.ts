import { createClient, type SanityClient } from "@sanity/client";
import { documentEventHandler } from "@sanity/functions";

/**
 * PROD-2228 — stamp editorial `publishedAt` when blank on:
 *  1. **system.release** with `publishAt` — stamp all blank post/caseStudy
 *     versions in that release to the intended schedule time (Schedule path;
 *     version create/update events alone were unreliable).
 *  2. Scheduled **version** docs (`versions.{releaseId}.{docId}`) — same stamp
 *     if a version event does fire.
 *  3. **Published** docs — fallback `now` after go-live / edge cases.
 *     Manual Publish is handled in Studio actions (`ensure-published-at`).
 *
 * Deploy: `pnpm dlx sanity blueprints deploy`
 * Logs: `pnpm dlx sanity functions logs stamp-published-at`
 */

type EventDoc = {
  _id?: string;
  _type?: string;
  name?: string | null;
  publishedAt?: string | null;
  publishAt?: string | null;
  metadata?: { intendedPublishAt?: string | null } | null;
};

const CONTENT_TYPES = ["post", "caseStudy"] as const;

function parseVersionId(
  id: string,
): { releaseId: string; publishedId: string } | null {
  // versions.{releaseId}.{documentId}
  if (!id.startsWith("versions.")) return null;
  const rest = id.slice("versions.".length);
  const dot = rest.indexOf(".");
  if (dot <= 0 || dot === rest.length - 1) return null;
  return {
    releaseId: rest.slice(0, dot),
    publishedId: rest.slice(dot + 1),
  };
}

function parseReleaseId(id: string): string | null {
  // _.releases.{releaseId}
  if (!id.startsWith("_.releases.")) return null;
  const releaseId = id.slice("_.releases.".length);
  return releaseId || null;
}

function toIsoOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function resolvePublishAtFromFields(fields: {
  publishAt?: string | null;
  metadata?: { intendedPublishAt?: string | null } | null;
}): string | null {
  return (
    toIsoOrNull(fields.publishAt) ??
    toIsoOrNull(fields.metadata?.intendedPublishAt)
  );
}

async function resolveReleasePublishAt(
  client: SanityClient,
  releaseId: string,
): Promise<string | null> {
  const release = await client.fetch<{
    publishAt?: string | null;
    metadata?: { intendedPublishAt?: string | null } | null;
  } | null>(
    `*[_id == $id][0]{ publishAt, metadata { intendedPublishAt } }`,
    { id: `_.releases.${releaseId}` },
  );
  if (!release) return null;
  return resolvePublishAtFromFields(release);
}

async function stampIfBlank(
  client: SanityClient,
  id: string,
  publishedAt: string,
  label: string,
): Promise<boolean> {
  const current = await client.fetch<string | null>(
    `*[_id == $id][0].publishedAt`,
    { id },
  );
  if (current?.trim()) {
    console.log(`[stamp-published-at] skip ${id}: already set`);
    return false;
  }

  await client.patch(id).set({ publishedAt }).commit({
    autoGenerateArrayKeys: false,
  });
  console.log(`[stamp-published-at] set publishedAt on ${id} → ${publishedAt} (${label})`);
  return true;
}

async function stampVersionsForRelease(
  client: SanityClient,
  releaseId: string,
  publishedAt: string,
): Promise<number> {
  const versions = await client.fetch<{ _id: string }[]>(
    `*[
      _id in path("versions." + $releaseId + ".**")
      && _type in $types
      && (!defined(publishedAt) || publishedAt == "")
    ]{_id}`,
    { releaseId, types: [...CONTENT_TYPES] },
  );

  let stamped = 0;
  for (const { _id } of versions ?? []) {
    const did = await stampIfBlank(
      client,
      _id,
      publishedAt,
      "version/pre-publish via release",
    );
    if (did) stamped += 1;
  }
  return stamped;
}

function makeClient(context: { clientOptions: Record<string, unknown> }) {
  return createClient({
    ...context.clientOptions,
    apiVersion: "2025-02-19",
    useCdn: false,
    perspective: "raw",
  });
}

export const handler = documentEventHandler(async ({ context, event }) => {
  const data = event.data as EventDoc | null;
  const id = data?._id;
  if (!id || id.startsWith("drafts.")) return;

  const client = makeClient(context);

  try {
    // ── Path A: release scheduled → stamp all blank post/caseStudy versions ──
    const releaseIdFromDoc =
      data?._type === "system.release"
        ? (data.name?.trim() || parseReleaseId(id))
        : parseReleaseId(id);

    if (releaseIdFromDoc && (data?._type === "system.release" || id.startsWith("_.releases."))) {
      const publishedAt =
        resolvePublishAtFromFields(data ?? {}) ??
        (await resolveReleasePublishAt(client, releaseIdFromDoc));

      if (!publishedAt) {
        console.warn(
          `[stamp-published-at] release ${releaseIdFromDoc}: no publishAt/intendedPublishAt yet`,
        );
        return;
      }

      const stamped = await stampVersionsForRelease(
        client,
        releaseIdFromDoc,
        publishedAt,
      );
      console.log(
        `[stamp-published-at] release ${releaseIdFromDoc}: stamped ${stamped} version(s) → ${publishedAt}`,
      );
      return;
    }

    // Fast path when the projection already shows a real date (content docs).
    if (data?.publishedAt?.trim()) return;

    // ── Path B: version doc event ────────────────────────────────────────────
    const version = parseVersionId(id);
    if (version) {
      const fromRelease = await resolveReleasePublishAt(
        client,
        version.releaseId,
      );
      const publishedAt = fromRelease ?? new Date().toISOString();
      if (!fromRelease) {
        console.warn(
          `[stamp-published-at] no release time for ${version.releaseId}; using now`,
        );
      }
      await stampIfBlank(client, id, publishedAt, "version/pre-publish");
      return;
    }

    // ── Path C: published-id fallback ────────────────────────────────────────
    await stampIfBlank(client, id, new Date().toISOString(), "published/fallback");
  } catch (error) {
    console.error(`[stamp-published-at] failed for ${id}:`, error);
    throw error;
  }
});
