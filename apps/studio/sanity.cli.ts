import {defineCliConfig} from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID,
        dataset: process.env.SANITY_STUDIO_DATASET,
    },
    // Two deployed studios are built from this one config, told apart ONLY by the
    // `--url` each deploy script passes (root package.json):
    //
    //   pakfactory.sanity.studio          → production  dataset  (pnpm sanity:deploy:prod)
    //   pakfactory-staging.sanity.studio  → development dataset  (pnpm sanity:deploy:staging)
    //
    // The dataset is baked in at BUILD time (Vite inlines SANITY_STUDIO_*), so the
    // URL and the dataset must be chosen together — a deployed studio cannot switch.
    //
    // Do NOT set `deployment.appId` or `studioHost` here. `findUserApplication`
    // resolves appId FIRST and falls back to the host only if it is absent
    // (@sanity/cli/dist/actions/deploy/findUserApplicationForStudio.js), so a pinned
    // appId would silently outrank `--url` and push a development-dataset build to
    // the production studio URL.
    //
    // `unstable_deployOnlyStudioWorkspace: true` used to sit here. The key does not
    // exist anywhere in sanity 5.x — it was a no-op, and it is gone rather than
    // left to look load-bearing.
});
