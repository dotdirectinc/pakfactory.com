import {defineCliConfig} from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp',
        dataset: process.env.SANITY_STUDIO_DATASET || 'development',
    },
    studioHost: 'pakfactory',
    // Deploy the admin workspace by default until per-channel deploy strategy is decided
    // @ts-expect-error — unstable API, not yet in CliConfig types
    unstable_deployOnlyStudioWorkspace: true,
});
