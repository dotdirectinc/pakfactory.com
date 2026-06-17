import {defineCliConfig} from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID,
        dataset: process.env.SANITY_STUDIO_DATASET,
    },
    // deployment: {
    //     appId: 'wzfe5kfkev9dwchv1b07110h'
    // },
    // studioHost: 'pakfactory',
    // Deploy the admin workspace by default until per-channel deploy strategy is decided
    // @ts-expect-error — unstable API, not yet in CliConfig types
    unstable_deployOnlyStudioWorkspace: true,
});
