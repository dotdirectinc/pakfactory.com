import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp',
    dataset: process.env.SANITY_STUDIO_DATASET || 'development',
  },
  studioHost: 'pakfactory-2',
  // Pin the deployed application so `sanity deploy` does not prompt for an app id.
  // Studio is hosted at https://pakfactory-2.sanity.studio (project 8293wrxp, admin workspace).
  deployment: {
    appId: 'glwrkx18pd61rgp5zof2o8u4',
  },
  // Deploy the admin workspace by default until per-channel deploy strategy is decided
  // @ts-expect-error — unstable API, not yet in CliConfig types
  unstable_deployOnlyStudioWorkspace: true,
})
