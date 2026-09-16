# Sanity Backup & Restore Runbook

Project: `8293wrxp` · Datasets: `production` / `development`

---

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

### Presentation caveat

`apps/studio/.env.production` points Presentation at the live apex
(`https://pakfactory.com/blog/`, `/case-studies/`) for **both** studios. In the staging
studio that tab shows the production site, which reads the `production` dataset — so
overlays will not match the `development` content being edited. Use the form and
structure tabs there, or give the staging deploy its own
`SANITY_STUDIO_PREVIEW_URL_*` and add those origins to the `allowOrigins` arrays in
`apps/studio/sanity.config.ts`.
