import { createClient, type SanityClient } from "@sanity/client";
import { documentEventHandler } from "@sanity/functions";

/**
 * PROD-2228 — stamp editorial `publishedAt` when blank on:
 *  1. Scheduled **version** docs (`versions.{releaseId}.{docId}`) — set to the
 *     release's intended/publish time *before* go-live so Schedule→publish does
 *     not need a post-publish patch (avoids leftover Studio drafts).
 *  2. **Published** docs — fallback `now` when still blank after go-live
 *     (webhook / edge cases). Manual Publish is handled in Studio actions.
 *
 * Deploy: `pnpm dlx sanity blueprints deploy`
 * Logs: `pnpm dlx sanity functions logs stamp-published-at`
 */

type EventDoc = {
  _id?: string;
  publishedAt?: string | null;
};

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

  const fromPublishAt = release?.publishAt?.trim();
  if (fromPublishAt) {
    const d = new Date(fromPublishAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const intended = release?.metadata?.intendedPublishAt?.trim();
  if (intended) {
    const d = new Date(intended);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

export const handler = documentEventHandler(async ({ context, event }) => {
  const data = event.data as EventDoc | null;
  const id = data?._id;
  if (!id || id.startsWith("drafts.")) return;

  // Fast path when the projection already shows a real date.
  if (data?.publishedAt?.trim()) return;

  const client = createClient({
    ...context.clientOptions,
    apiVersion: "2025-02-19",
  });

  try {
    const current = await client.fetch<string | null>(
      `*[_id == $id][0].publishedAt`,
      { id },
    );
    if (current?.trim()) {
      console.log(`[stamp-published-at] skip ${id}: already set`);
      return;
    }

    const version = parseVersionId(id);
    let publishedAt: string;

    if (version) {
      const fromRelease = await resolveReleasePublishAt(
        client,
        version.releaseId,
      );
      publishedAt = fromRelease ?? new Date().toISOString();
      if (!fromRelease) {
        console.warn(
          `[stamp-published-at] no release time for ${version.releaseId}; using now`,
        );
      }
    } else {
      // Published document fallback (post-publish); prefer avoided via version stamp.
      publishedAt = new Date().toISOString();
    }

    await client.patch(id).set({ publishedAt }).commit({
      autoGenerateArrayKeys: false,
    });
    console.log(
      `[stamp-published-at] set publishedAt on ${id} → ${publishedAt}` +
        (version ? " (version/pre-publish)" : " (published/fallback)"),
    );
  } catch (error) {
    console.error(`[stamp-published-at] failed for ${id}:`, error);
    throw error;
  }
});
