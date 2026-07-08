import { env } from "node:process";

import { documentEventHandler } from "@sanity/functions";
import { algoliasearch } from "algoliasearch";

import {
  ALGOLIA_INDEX_NAME,
  shouldRemoveFromAlgolia,
  toAlgoliaRecord,
  type AlgoliaPostSource,
} from "./record";

const {
  ALGOLIA_APP_ID = "",
  ALGOLIA_WRITE_KEY = "",
  SANITY_PROJECT_ID = "",
  SANITY_DATASET = "",
} = env;

export const handler = documentEventHandler(async ({ event }) => {
  const data = event.data as AlgoliaPostSource;
  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  if (shouldRemoveFromAlgolia(data)) {
    try {
      await algolia.deleteObject({
        indexName: ALGOLIA_INDEX_NAME,
        objectID: data._id,
      });
      console.log(
        `Removed ${data._id} (${data.operation === "delete" ? "deleted" : "allowIndex=false"})`,
      );
    } catch (error) {
      console.error("Error deleting from Algolia:", error);
      throw error;
    }
    return;
  }

  try {
    const record = toAlgoliaRecord(data, SANITY_PROJECT_ID, SANITY_DATASET);
    await algolia.addOrUpdateObject({
      indexName: ALGOLIA_INDEX_NAME,
      objectID: data._id,
      body: record,
    });
    const imageInfo = record.image ? `image: ${record.image}` : "no image";
    console.log(`Synced ${data._id} ("${record.title}") – ${imageInfo}`);
  } catch (error) {
    console.error("Error syncing to Algolia:", error);
    throw error;
  }
});
