import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    // Canonical project = PakFactory (8293wrxp), which already hosts
    // pakfactory.sanity.studio. ix8fju7k ("PakFactory - Old") is being retired.
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp',
    dataset: process.env.SANITY_STUDIO_DATASET || 'development',
  },
  // Hosted at https://pakfactory.sanity.studio (project 8293wrxp). The app already
  // exists, so we DON'T pin `studioHost` here — pinning it makes `sanity deploy`
  // try to *create* a new hostname and fail with "already taken". With it omitted,
  // deploy attaches to the existing application (interactive picker on first run).
  // After a successful deploy, pin the reported app id: deployment: { appId: '...' }.
  // studioHost: 'pakfactory',
  // Deploy ALL workspaces (admin · website · blog), not just admin — the
  // Website/Blog workspaces carry the Presentation (live preview) tool, so they
  // must ship to the hosted Studio. (Was `unstable_deployOnlyStudioWorkspace: true`,
  // which deployed only admin and hid the preview lenses in the cloud.)
})
