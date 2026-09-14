import { env } from "node:process";

import { documentEventHandler } from "@sanity/functions";
import { algoliasearch } from "algoliasearch";

import {
  contentIndexForType,
  shouldRemoveContentFromAlgolia,
  toAlgoliaContentRecord,
  type AlgoliaContentSource,
} from "./record";

const { ALGOLIA_APP_ID = "", ALGOLIA_WRITE_KEY = "" } = env;

export const handler = documentEventHandler(async ({ event }) => {
  const data = event.data as AlgoliaContentSource;
  const indexName = contentIndexForType(data._type);
  if (!indexName) {
    console.log(`Skipping unsupported _type=${data._type} id=${data._id}`);
    return;
  }

  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  if (shouldRemoveContentFromAlgolia(data)) {
    try {
      await algolia.deleteObject({
        indexName,
        objectID: data._id,
      });
      console.log(`Removed ${data._id} from ${indexName}`);
    } catch (error) {
      console.error("Error deleting content from Algolia:", error);
      throw error;
    }
    return;
  }

  try {
    const record = toAlgoliaContentRecord(data);
    if (!record.slug) {
      console.log(`Skip ${data._id}: missing slug`);
      return;
    }
    await algolia.addOrUpdateObject({
      indexName,
      objectID: data._id,
      body: record,
    });
    console.log(`Synced ${data._id} → ${indexName} ("${record.title}")`);
  } catch (error) {
    console.error("Error syncing content to Algolia:", error);
    throw error;
  }
});
