# Sanity Backup & Restore Runbook

Project: `8293wrxp` · Datasets: `production` / `development`

---

> **Content migrations live next door.** This runbook covers backup / restore / dataset ops.
> For *which one-shot migrations have run against which dataset*, and the single command that
> runs the rest, see [`MIGRATIONS.md`](./MIGRATIONS.md) (`pnpm sanity:migrate status --dataset <name>`).
>
> **Rebuilding the catalog from source** — deleting products and customizations and refilling
> them from Notion + the Miro board — is a third thing again, and has its own sequence and
> hazards (strong references block deletes; the four customization categories must survive).
> See [`CATALOG-REBUILD.md`](./CATALOG-REBUILD.md).

## npm scripts (quick reference)

| Command | What it does |
|---|---|
| `pnpm sanity:switch:dev` | Point all apps at the `development` dataset |
| `pnpm sanity:switch:prod` | Point all apps at the `production` dataset ⚠️ |
| `pnpm sanity:backup:dev` | Export `development` → `backups/sanity-development-YYYYMMDD-HHmmss.tar.gz` |
| `pnpm sanity:backup:prod` | Export `production` → `backups/sanity-production-YYYYMMDD-HHmmss.tar.gz` |
| `pnpm sanity:restore:dev` | Import a backup file into `development` (interactive file picker) |
| `pnpm sanity:restore:prod` | Import a backup file into `production` (requires typing "yes") ⚠️ |
| `pnpm sanity:diff` | Compare prod vs dev — counts per type + missing/modified docs |
| `pnpm sanity:sync-prod-to-dev` | Backup prod + overwrite dev with it |
| `pnpm studio:status` | Which Studio each app points at, and whether it matches the dataset |
| `pnpm studio:local` / `:staging` / `:prod` | Point the apps at that Studio (see § Studio targets) |

> ⚠️ **The backup, restore and sync commands need Node ≥ 22.12.** They shell out to
> `npx sanity@latest`, which no longer runs on the repo's pinned Node 20 — `nvm use 22` first.
>
> **`pnpm` is installed per Node version**, so it usually does not exist under 22. Call the script
> directly instead of going through pnpm:
>
> ```bash
> nvm use 22 && node scripts/sanity/backup.mjs production
> ```
>
> The token comes from `.env.local` (`SANITY_BACKUP_TOKEN`, or any of `SANITY_AUTH_TOKEN` /
> `SANITY_API_WRITE_TOKEN` / `SANITY_API_READ_TOKEN`) — nothing to export by hand.

---

## GitHub Actions secrets (required before workflow runs)

| Secret | How to obtain |
|---|---|
| `SANITY_BACKUP_TOKEN` | [sanity.io/manage](https://sanity.io/manage) → project `8293wrxp` → API → Tokens → Add token (name: "GitHub Actions Backup", role: **Viewer**) |
| `GDRIVE_SERVICE_ACCOUNT_JSON` | GCP Console → IAM & Admin → Service Accounts → create account → Keys → Add Key → JSON. Share the `06_Sanity Studio Backup` Drive folder with the service account email. |
| `GDRIVE_FOLDER_ID` | Open `06_Sanity Studio Backup` in Google Drive → copy the ID from the URL: `drive.google.com/drive/folders/**<FOLDER_ID>**` |

Add all three at: **GitHub repo → Settings → Secrets and variables → Actions**

---

## Restore procedure

### Restore development from a nightly backup

```bash
# Interactive — shows a list of available backups to choose from
pnpm sanity:restore:dev

# Or specify the file directly
pnpm sanity:restore:dev backups/sanity-production-20260713-010000.tar.gz
```

### Restore production from a backup (emergency)

```bash
# Requires typing "yes" at the confirmation prompt
pnpm sanity:restore:prod backups/sanity-production-20260713-010000.tar.gz
```

### Restore from a Google Drive backup

1. Open Google Drive → `06_Sanity Studio Backup` → find the dated folder
2. Download the `.tar.gz` file to `backups/`
3. Run `pnpm sanity:restore:dev <file>` or `pnpm sanity:restore:prod <file>`

---

## Verify a backup (restore test)

Run this quarterly. Uses a temporary scratch dataset so production is never touched.

```bash
# 1. Create a scratch dataset (one-time setup)
npx sanity@latest dataset create scratch -p 8293wrxp

# 2. Import the backup into scratch
npx sanity@latest dataset import backups/sanity-production-<stamp>.tar.gz scratch \
  --replace -p 8293wrxp

# 3. Verify document counts match production
node scripts/sanity/diff-datasets.mjs  # adapt query to compare scratch vs prod if needed

# 4. Delete scratch when done
npx sanity@latest dataset delete scratch -p 8293wrxp
```

Document the test date and result in the table below.

---

## Restore test log

| Date | Backup file | Target dataset | Result | Tested by |
|---|---|---|---|---|
| _YYYY-MM-DD_ | `sanity-production-YYYYMMDD.tar.gz` | `scratch` | ✅ Pass | — |

---

## Backup retention policy

| Type | Location in Drive | Retention |
|---|---|---|
| Nightly | `06_Sanity Studio Backup/MMDDYYYY/` | 30 days (auto-pruned) |
| Monthly (1st of month) | `06_Sanity Studio Backup/monthly/YYYYMM/` | 12 months (auto-pruned) |

Pruning runs automatically as part of the nightly workflow.

---

## Local backups

The `backups/` directory at the repo root is gitignored. Files are not committed.  
Clean up old local backups manually: `rm backups/sanity-*.tar.gz`

---

## Studio targets — which Studio the apps point at

There are **three** axes, and they only work pointed at the same place:

| Axis | Direction | Variables |
|---|---|---|
| Dataset | which content | `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_STUDIO_DATASET` |
| Studio URL | apps → Studio, where an overlay click lands | `NEXT_PUBLIC_SANITY_STUDIO_URL` |
| Preview URL | Studio → sites, what the Presentation pane shows | `SANITY_STUDIO_PREVIEW_URL_{BLOG,WWW,SITE}` |

`NEXT_PUBLIC_SANITY_STUDIO_URL` is `stega.studioUrl` in each app's
`lib/sanity/client.ts`, active only for the `drafts` perspective — i.e. exactly
when someone is editing.

**All three travel with the dataset.** A deployed Studio reads one dataset, baked
in at build time, so the Studio URL *implies* a dataset — and so does every
preview host. Two ways to get it wrong, and `studio:status` names both:

- app dataset ≠ Studio URL's dataset → an overlay click opens a Studio that does
  not contain the document; the editor sees "not found" for what is on screen.
- Studio dataset ≠ preview host's dataset → the pane renders content the editor
  is not editing, so no overlay can line up.

**One deliberate exception.** The `prod` target's `SITE` preview points at
`staging.pakfactory.com`, cross-dataset on purpose: production has no site root
to preview. The apex root is Magento — `pakfactory.com/products` redirects home
and `/capabilities` 404s — so the product / solution / customization routes exist
only on staging. `status` prints that as `ℹ️ by design`, not a warning (decided
2026-09-16; the deployed prod Studio already ships this in `.env.production`).

| Command | Studio | Dataset | Previews (BLOG · WWW · SITE) |
|---|---|---|---|
| `pnpm studio:status` | — shows all three axes, and names any mismatch — |||
| `pnpm studio:local` | `localhost:3333` | `development` | `:3003/` · `:3000/case-studies/` · `:3000/` |
| `pnpm studio:staging` | `pakfactory-staging.sanity.studio` | `development` | `staging-blog…/blog/` · `staging…/case-studies/` · `staging…/` |
| `pnpm studio:prod` | `pakfactory.sanity.studio` (needs `--yes`) | `production` | `pakfactory.com/blog/` · `…/case-studies/` · `staging…/` ℹ️ |

Preview hosts must also be in the workspace's `allowOrigins` in
`sanity.config.ts` or Presentation bounces the iframe. The staging hosts are
listed there. **`staging-blog.pakfactory.com` sits behind Vercel Deployment
Protection:** signed into the Vercel team it serves 200 with no
`x-frame-options` and iframes fine; without a session it 302s to an SSO page
carrying `x-frame-options: DENY`, so the pane goes blank rather than erroring.

`studio:status` exits non-zero when the pair is incoherent or the apps disagree on
the dataset, so it works in a pre-flight check. It writes only local
`.env.local` files — it cannot reach a deployed app.

### The deployed apps

Their values live in **Vercel project settings, per environment**, and nothing in
this repo changes them:

```bash
vercel env ls                                   # names + which environments
vercel env pull .env.x --environment=preview     # values, except Sensitive ones
```

`NEXT_PUBLIC_SANITY_STUDIO_URL` is stored **Sensitive** on `pakfactory-blog`
(Production and Preview each have their own entry), which means it can be
replaced but **never read back** — not by the CLI, not in the dashboard. To learn
what a deployment actually shipped, read the dataset off its asset URLs
(`cdn.sanity.io/…/8293wrxp/<dataset>/…` in the served HTML) rather than trusting
a settings page.

Measured 2026-09-16:

| Deployment | Dataset it reads |
|---|---|
| `pakfactory.com/blog` (Production) | `production` |
| `staging-blog.pakfactory.com/blog` (Preview, `staging`) | `development` |
| `staging.pakfactory.com` (www, `www-new-release`) | `development` |

### staging-blog returns 404 at its root — by design, twice over

1. The host is behind **Vercel Deployment Protection**: an unauthenticated request
   302s to `vercel.com/sso-api`, which in a browser looks like the site is down.
   Use `vercel curl <url>` (it carries your Vercel auth) rather than `curl`.
2. Even authenticated, `/` is a **Next 404**: the blog is mounted under a
   `basePath` of `/blog` (`NEXT_PUBLIC_BLOG_BASE_PATH`, see
   `apps/blog/next.config.ts`). The working URL is
   **https://staging-blog.pakfactory.com/blog**.

---

## Environment mapping

| Variable | `development` | `production` |
|---|---|---|
| `NEXT_PUBLIC_SANITY_DATASET` | `development` | `production` |
| `SANITY_STUDIO_DATASET` | `development` | `production` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `8293wrxp` | `8293wrxp` |

Switch using `pnpm sanity:switch:dev` or `pnpm sanity:switch:prod` — never edit `.env.local` manually.

---

## Deployed studios

Two studios, one codebase. A deployed studio's dataset is **baked in at build time**
(Vite inlines `SANITY_STUDIO_*`), so it cannot be switched from inside the Studio —
the URL and the dataset are chosen together, by the deploy script.

| URL | Dataset | Deploy with | Who it's for |
|---|---|---|---|
| [pakfactory.sanity.studio](https://pakfactory.sanity.studio) | `production` | `pnpm sanity:deploy:prod` | the content team — live content |
| [pakfactory-staging.sanity.studio](https://pakfactory-staging.sanity.studio) | `development` | `pnpm sanity:deploy:staging` | testing schema + Studio changes |

Each workspace title carries the dataset when it is not production (`Blog [DEVELOPMENT]`,
`Products [DEVELOPMENT]`, …) — `datasetSuffix` in `apps/studio/sanity.config.ts`. That
suffix is how you tell the two tabs apart; check it before publishing.

> **"staging" here names the studio, not a backend environment.** The dataset behind
> `pakfactory-staging` is `development`. This repo keeps `pnpm env:staging` (Supabase +
> API) and `pnpm sanity:switch:*` (Sanity dataset) deliberately separate — see the
> header of `scripts/env/switch-env.mjs`. The studio host borrows the *word* staging
> because that is what the team calls the place it tests; it moves no backend anything.

### Adding another one

`sanity deploy` picks its target from `--url` (there is no `appId` pinned in
`sanity.cli.ts`, on purpose — a pinned appId would outrank `--url`). The **first**
deploy to a hostname that does not exist yet is interactive: it prints "Your project
has not been assigned a studio hostname" and prompts for it, so do not pass `--yes`
on a first run. Afterwards the host is found automatically and the script is
non-interactive.

Hostnames are a **single label** of letters, numbers and hyphens —
`pakfactory-staging` ✅, `staging.pakfactory` ❌. A dot is rejected by the CLI, and
Sanity's `*.sanity.studio` certificate only covers one label, so a nested hostname
fails the TLS handshake even though DNS resolves it. Your own domain needs
`sanity deploy --external`, where you host the built bundle yourself.

After creating a studio, add its CORS origin (the CLI does not):

```bash
pnpm --filter @pakfactory/studio exec sanity cors add https://pakfactory-staging.sanity.studio --credentials
```

Testers need project membership at [manage.sanity.io](https://manage.sanity.io) →
Members. Both datasets are `aclMode: public`, so reads are open, but logging in and
publishing needs a seat — Editor is enough.

### Presentation targets travel with the deploy

Each deploy bakes in its own `SANITY_STUDIO_PREVIEW_URL_*`, from `TARGETS` in
`scripts/sanity/studio-targets.mjs` — the same table `pnpm studio:*` writes into
`.env.local`, so a deployed Studio and a local one cannot disagree about which site
a workspace previews:

| Studio | BLOG | WWW | SITE |
|---|---|---|---|
| staging (`development`) | `staging-blog.pakfactory.com/blog/` | `staging.pakfactory.com/case-studies/` | `staging.pakfactory.com/` |
| prod (`production`) | `pakfactory.com/blog/` | `pakfactory.com/case-studies/` | `staging.pakfactory.com/` (the exception above) |

To change one, edit `TARGETS`, make sure the origin is in that workspace's
`allowOrigins` in `apps/studio/sanity.config.ts` (Presentation refuses to frame
anything else), and re-deploy.

> **Why a script and not an env prefix on the deploy command.** `sanity build` runs
> Vite in production mode, and Vite's precedence is
> `shell env > .env.production > .env.local > .env`. So `apps/studio/.env.production`
> — written for the production Studio — outranks `.env.local`. The deploy scripts
> used to export only `SANITY_STUDIO_DATASET`, which is how the staging Studio
> shipped with the development dataset **and** `https://pakfactory.com/blog/` as its
> blog preview: the pane showed production content while the editor edited
> development content, and `pnpm studio:staging` could not fix it because it writes
> the file that loses. `scripts/sanity/studio-deploy.mjs` exports the whole target
> instead, and shell env beats every `.env` file.

Staging's blog host sits behind Vercel Deployment Protection. Signed into the Vercel
team it serves 200 with no `x-frame-options` and iframes fine; without a session it
302s to an SSO page carrying `x-frame-options: DENY`, so the pane renders **blank**
rather than erroring.
