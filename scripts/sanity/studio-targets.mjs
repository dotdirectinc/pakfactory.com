/**
 * The Studio↔dataset↔preview-host pairings, in one place.
 *
 * Two scripts need these and they must not drift apart:
 *
 *   studio-target.mjs  — points the LOCAL apps at a Studio (writes `.env.local`)
 *   studio-deploy.mjs  — bakes them into a DEPLOYED Studio (`sanity deploy`)
 *
 * They used to disagree. `studio-target.mjs` knew that the staging Studio previews
 * `staging-blog.pakfactory.com`, while `sanity:deploy:staging` overrode only the
 * dataset and let the preview URLs fall through to `apps/studio/.env.production` —
 * which is written for the production Studio. Vite gives `.env.[mode]` precedence
 * over `.env.local`, so the deployed staging Studio shipped the PRODUCTION blog as
 * its Presentation target no matter what a developer's `.env.local` said. Data
 * lives here so there is only one copy to get right.
 *
 * A deployed Studio can only read ONE dataset — Vite inlines `SANITY_STUDIO_*` at
 * build time — so the dataset is a property OF the target, not a separate choice.
 */

/**
 * The three coherent pairings. `studioUrl` is where the Studio lives (or, for a
 * deployed target, `deployHost` is the single-label hostname `sanity deploy --url`
 * takes); `previews` is what its Presentation pane points AT.
 *
 * Every preview base needs a TRAILING SLASH: Presentation resolves the relative
 * draft-mode `enable` path against it, and without the slash the last path segment
 * is replaced instead of appended (PROD-2223).
 */
export const TARGETS = {
  local: {
    studioUrl: "http://localhost:3333",
    dataset: "development",
    label: "local Studio (pnpm dev:studio)",
    // What the Studio's Presentation pane points AT. Ports are taken from the
    // apps' own dev scripts, not from habit: `apps/www` runs on **3003** and
    // `apps/blog` on **3004** (`next dev --port …` in each package.json). The
    // earlier values here said blog 3003 / www 3000 — inherited from stale
    // fallbacks in sanity.config.ts, and 3000 has nothing on it at all.
    previews: {
      BLOG: "http://localhost:3004/",
      WWW: "http://localhost:3003/case-studies/",
      SITE: "http://localhost:3003/",
    },
  },
  staging: {
    studioUrl: "https://pakfactory-staging.sanity.studio",
    deployHost: "pakfactory-staging",
    dataset: "development",
    label: "staging Studio",
    previews: {
      // staging-blog is mounted under /blog (NEXT_PUBLIC_BLOG_BASE_PATH), so the
      // base carries it — the bare host 404s.
      BLOG: "https://staging-blog.pakfactory.com/blog/",
      WWW: "https://staging.pakfactory.com/case-studies/",
      SITE: "https://staging.pakfactory.com/",
    },
  },
  prod: {
    studioUrl: "https://pakfactory.sanity.studio",
    deployHost: "pakfactory",
    dataset: "production",
    label: "production Studio",
    previews: {
      BLOG: "https://pakfactory.com/blog/",
      WWW: "https://pakfactory.com/case-studies/",
      // NOT WIRED YET — deliberately null, and this is the release switch.
      //
      // The site-root workspaces (Products, Customization, Solutions, Expertise,
      // Resources, Main Website, Global) are unreleased: their routes exist only
      // on the staging surface. QA previews them from the **staging** Studio,
      // where Studio and site share the `development` dataset.
      //
      // Pointing this at staging instead would look like it worked and could not:
      // Presentation's preview secret is a document in the Studio's OWN dataset,
      // so a production-dataset Studio previewing a development-dataset site
      // fails with "Invalid secret" every time. Verified 2026-09-17 — the secret
      // documents land in `production` while the site looks for them in
      // `development`.
      //
      // ON RELEASE: set this to the production site root (e.g.
      // "https://pakfactory.com/") and the seven workspaces gain their
      // Presentation tab in the production Studio automatically — the Studio
      // config adds the tool only when a target is wired. One value, one switch.
      SITE: null,
    },
  },
};

/**
 * Which dataset each preview host actually serves. Measured 2026-09-16 by reading
 * the asset URLs out of the served HTML (`cdn.sanity.io/…/8293wrxp/<dataset>/…`),
 * not read off a settings page — the Vercel values are stored Sensitive and
 * cannot be read back. Re-measure if a deployment's env changes.
 */
export const HOST_DATASET = {
  "localhost:3003": "development",
  "localhost:3004": "development",
  "staging-blog.pakfactory.com": "development",
  "staging.pakfactory.com": "development",
  "pakfactory.com": "production",
};

/**
 * The `SANITY_STUDIO_PREVIEW_URL_*` variable name for each preview key. Shared so
 * the `.env.local` writer and the deploy env builder cannot spell them differently
 * from `apps/studio/sanity.config.ts`, which reads them.
 */
export const PREVIEW_VARS = {
  BLOG: "SANITY_STUDIO_PREVIEW_URL_BLOG",
  WWW: "SANITY_STUDIO_PREVIEW_URL_WWW",
  SITE: "SANITY_STUDIO_PREVIEW_URL_SITE",
};
