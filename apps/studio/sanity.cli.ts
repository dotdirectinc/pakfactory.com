import { defineCliConfig } from "sanity/cli";

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "";
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production";

export default defineCliConfig({
  api: { projectId, dataset },
  deployment: {
    /**
     * Auto-updates: hosted Studio tracks latest (or your chosen channel in sanity.io/manage).
     * Add `appId` from the Studio tab in sanity.io/manage for fine-grained version selection.
     * @see https://www.sanity.io/docs/studio/latest-version-of-sanity
     */
    autoUpdates: true,
  },
});
