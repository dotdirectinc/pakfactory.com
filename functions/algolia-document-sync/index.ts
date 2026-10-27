import { env } from "node:process";

import { documentEventHandler } from "@sanity/functions";
import { algoliasearch } from "algoliasearch";

import {
  algoliaPostIndexName,
  isAlgoliaDataset,
  shouldRemoveFromAlgolia,
  toAlgoliaRecord,
  type AlgoliaPostSource,
} from "./record";

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

export const handler = documentEventHandler(async ({ context, event }) => {
  // The dataset comes from the event, not from deploy-time env (PROD-3202). The
  // Function is not pinned, so it runs for every dataset in the project; each one
  // writes its own index, and image URLs point at the dataset that holds the asset.
  const { projectId, dataset } = context.clientOptions;
  if (!isAlgoliaDataset(dataset)) {
    console.log(`Skipped ${event.data?._id}: dataset "${dataset}" has no Algolia index`);
    return;
  }
  const indexName = algoliaPostIndexName(dataset);
  const data = event.data as AlgoliaPostSource;
  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  if (shouldRemoveFromAlgolia(data)) {
    try {
      await algolia.deleteObject({ indexName, objectID: data._id });
      console.log(
        `Removed ${data._id} from ${indexName} (${data.operation === "delete" ? "deleted" : "allowIndex=false"})`,
      );
    } catch (error) {
      // algoliasearch errors embed request headers, including the write key.
      console.error("Error deleting from Algolia:", errorSummary(error));
      throw new Error("Algolia delete failed");
    }
    return;
  }

  try {
    const record = toAlgoliaRecord(data, projectId, dataset);
    await algolia.addOrUpdateObject({ indexName, objectID: data._id, body: record });
    const imageInfo = record.image ? `image: ${record.image}` : "no image";
    console.log(`Synced ${data._id} ("${record.title}") to ${indexName} – ${imageInfo}`);
  } catch (error) {
    console.error("Error syncing to Algolia:", errorSummary(error));
    throw new Error("Algolia sync failed");
  }
});

function errorSummary(error: unknown): string {
  const e = error as { status?: number; message?: string };
  return `${e?.status ?? ""} ${e?.message ?? String(error)}`.trim();
}
