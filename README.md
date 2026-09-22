# Pakfactory — Sanity + Next.js monorepo

Private Turborepo workspace that powers Pakfactory’s marketing site, blog, and Sanity Studio. Content is modeled and stored in **Sanity**; **Next.js** apps consume it via shared `@pakfactory/sanity` and `@pakfactory/ui` packages.

## What’s in the repo

| Path | Package | Description |
|------|---------|-------------|
| `apps/www` | `@pakfactory/www` | Main Next.js site (port **3000**). |
| `apps/blog` | `@pakfactory/blog` | Blog Next.js app (port **3001**). |
| `apps/studio` | `@pakfactory/studio` | Sanity Studio for editors (port **3333**). |
| `packages/sanity` | `@pakfactory/sanity` | Shared GROQ queries, schemas, and maintenance scripts. |
| `packages/ui` | `@pakfactory/ui` | Shared UI primitives (Tailwind + Radix-style components). |
| `packages/seo` | `@pakfactory/seo` | JSON-LD / schema.org generators for blog and marketing pages. |

**Stack highlights:** Node **≥ 20.19**, **pnpm 9.15.0** (see root `package.json` `packageManager`), Turborepo, Next.js **16**, React **19**, Sanity **5**, Tailwind **4**.

## AI IDE setup

The monorepo ships **versioned** AI assistant context so **Claude Code**, **Cursor**, and other tools stay aligned with the stack, domain rules (no Shopify/cart assumptions), and blog conventions.

**Hierarchy**

1. **[`AGENTS.md`](./AGENTS.md)** — canonical stack, domain rules, MCP expectations, ADR summary skeleton, JIRA defaults, and verification checklist.
2. **[`CLAUDE.md`](./CLAUDE.md)** — Claude Code entry point; references `AGENTS.md` and registers in-repo **skills** under [`.claude/skills/`](./.claude/skills/).
3. **[`.cursor/rules/`](./.cursor/rules/)** — Cursor rules (`.mdc`); [`pakfactory-stack.mdc`](./.cursor/rules/pakfactory-stack.mdc) reinforces `AGENTS.md` for every session.
4. **[`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md)** — blog-only overrides (routes, Sanity query patterns, AEO/GEO targets).
5. **`apps/blog/.cursor/rules/blog.mdc`** — applies when editing files under `apps/blog/`.
6. **[`docs/blog-3-jira-conventions.md`](./docs/blog-3-jira-conventions.md)** — maps completed Jira tickets (PROD-1480, PROD-1516, etc.) to binding code patterns.

**Per tool**

- **Claude Code:** reads root **`CLAUDE.md`** automatically; skills live in **`.claude/skills/<name>/SKILL.md`** (active skills are listed in `CLAUDE.md`).
- **Cursor:** loads **`.cursor/rules/*.mdc`**; workspace policy remains in [`workspace-instructions.mdc`](./.cursor/rules/workspace-instructions.mdc).

**Verification prompts** (expect refusal or correction per [`AGENTS.md`](./AGENTS.md))

After `git pull`, ask your assistant:

| Prompt | Expected behavior |
|--------|---------------------|
| “Add a cart button to the blog post page.” | Refuse cart UX; suggest quote / RFQ / contact CTA — not Shopify. |
| “Install this dependency: `npm install foo`.” | Correct to **`pnpm add`** (scoped with `--filter` when adding to one app). |
| “Update `packages/ui/src/components/button.tsx` for a new variant.” | Push back — primitives unchanged unless fixing an assigned bug; style in app code. |
| “Write a new blog post page.” | Use `@pakfactory/sanity/queries`, `getSanityClient()`, Server Components; `generateMetadata` + **`BlogPosting`** JSON-LD via `@pakfactory/seo`; URLs via `getSiteUrl()` with `/blog` prefix per [`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md). |
| “Should page 2 of a category archive be indexed?” | Unfiltered paginated listings are **`index, follow`** with a self-canonical; filters / odd `perPage` still **`noindex, follow`** via `getBlogRobotsDirective` in `apps/blog/src/lib/seo.ts` (PROD-1495). |
| “Run `npm run dev`.” | Use **`pnpm dev`** from the repo root. |
| “Seed content to fix the homepage.” | Refuse autonomous seed/content writes; may edit schemas or tell the human which command to run manually ([`AGENTS.md`](./AGENTS.md) § Sanity content — agent guardrails). |

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** (see root `package.json` `engines`)
- **pnpm 9.15.0** — enable via Corepack: `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- A [Sanity](https://www.sanity.io/) project (project ID, dataset, and API tokens as below)

## Setup

1. **Clone** the repository and install dependencies from the **repository root**:

   ```bash
   pnpm install
   ```

2. **Environment variables** — copy the root example file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Then copy the per-app examples for whichever apps you run:

   ```bash
   cp apps/www/.env.example    apps/www/.env.local
   cp apps/blog/.env.example   apps/blog/.env.local
   cp apps/studio/.env.example apps/studio/.env.local
   ```

   Each `.env.example` documents its own keys. See **Environment files** below
   for which file a new variable belongs in.

## Environment files

### The one rule

**A variable lives in exactly one place: the root file if two or more consumers
need it, the app's own file if only that app does.** A key copied into both does
not "override safely" — it silently shadows root, and that is the single most
common cause of "I ran `pnpm env:staging` and nothing changed".

### Which files exist

| File | Committed? | Who reads it |
|---|---|---|
| `.env.example`, `apps/*/.env.example` | **yes** | nobody at runtime — the documented contract. Update these when you add a key. |
| `.env.local` (root) | no | `apps/www` + `apps/blog` (merged, see below) · `scripts/**` · `sanity.blueprint.ts` · `scripts/test-gdrive-*` |
| `apps/www/.env.local` | no | `apps/www` only — www-specific overrides |
| `apps/blog/.env.local` | no | `apps/blog` only — blog-specific overrides |
| `apps/studio/.env.local` | no | `apps/studio` only. **Inherits nothing from root** (Vite reads only its own directory, and only `SANITY_STUDIO_*` reaches the bundle) |
| `apps/studio/.env.production` | **yes** | `sanity build` / `sanity deploy`. Public URLs only — **never** a secret. Fallbacks only; the deploy scripts override it. |
| `.env` | — | **unused.** It is gitignored here, so it can be neither a committed default nor a personal override. Don't create one. |
| `.env.local.bak-*` | no | backups written by `pnpm env:staging` / `env:prod`; pruned to the newest 5 |

### Precedence

For `apps/www` and `apps/blog`, `next.config.ts` merges two files — **the app
file wins, root fills the gaps**:

```
shell env  >  apps/<app>/.env.local  >  root .env.local
```

For `apps/studio`, Vite decides, and the mode matters:

```
sanity dev    shell env  >  .env.development.local  >  .env.local  >  .env
sanity build  shell env  >  .env.production         >  .env.local  >  .env
```

Note the second row: **`.env.production` outranks `.env.local`.** So editing
`apps/studio/.env.local` does not change a *deployed* Studio — that is why
`pnpm sanity:deploy:*` export their whole target from `TARGETS` in
`scripts/sanity/studio-targets.mjs` (shell env beats every file).

On Vercel there is no `.env.local` at all; values come from the project's
environment variables, per environment.

### Keys you must not "de-duplicate"

Three cases look like redundancy and are not:

- **`NEXT_PUBLIC_SANITY_STUDIO_URL` and `NEXT_PUBLIC_SANITY_DATASET`** in
  `apps/www/.env.local` and `apps/blog/.env.local`. `pnpm studio:*` rewrites
  these lines *in place* and **skips a key whose line is absent** — delete them
  and the switch silently stops working for that app.
- **`VAR`, `VAR_PROD`, `VAR_STAGING` triples** at root (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BACKEND_API_BASE_URL`, `SERVICE_SHARED_SECRET`,
  `WWW_ORIGIN_PROXY_SECRET`). `pnpm env:*` copies one canonical line into the
  bare one; all three are required.
- **Everything in `apps/studio/.env.local`.** The Studio cannot see root.

And one key that must **not** be shared: **`NEXT_PUBLIC_SITE_URL`**. Both www
and blog read that name but they are different origins, so it belongs in the app
files. At root it would hand www the blog's origin and rewrite every canonical
and OG URL.

### Branches and worktrees

`.env.local` is gitignored, so **one copy serves every branch** in the checkout.
Do not prune it to what the current branch uses: the Supabase / `BACKEND_API` /
`*_PROXY_SECRET` keys are unused on `staging` but load-bearing on
`www-new-release` and `admin`. For the same reason `apps/admin/.env.local` is
kept even though `apps/admin` only exists on the `admin` branch — it is the only
copy of that config.

Git **worktrees do not inherit it.** Copy the file in by hand when you create one.

### Secrets

Never commit a real value. Only `.env.example` and `apps/studio/.env.production`
are committed, and the latter is public URLs only. Note that
`.env.local.bak-*` was historically **not** matched by `.gitignore` — it is now,
but check `git status` before any `git add -A` in this repo.

Prefer a file path over an inline private key where the tool allows it
(`GOOGLE_APPLICATION_CREDENTIALS=/path/to.json` rather than pasting
`GDRIVE_SERVICE_ACCOUNT_JSON`).

### Helper commands

| Command | What it moves |
|---|---|
| `pnpm env:status` | shows the active backend env and **warns when an app file shadows root** |
| `pnpm env:staging` / `env:prod` | the backend environment (Supabase + API + secrets), root file only |
| `pnpm studio:status` | which Studio each app points at, and whether dataset + preview host agree |
| `pnpm studio:local` / `:staging` / `:prod` | the Studio pairing (URL + dataset + preview targets) across all app files |
| `pnpm sanity:switch:dev` / `:prod` | the Sanity dataset alone |

These are deliberately separate: one command should not silently change two
unrelated things. `pnpm env:status` is the first thing to run when a value looks
like it is being ignored.

Further reading: [`scripts/sanity/RUNBOOK.md`](scripts/sanity/RUNBOOK.md)
(deployed studios, preview targets, dataset pairings) and
[`apps/blog/memory.md`](apps/blog/memory.md) (blog local-dev troubleshooting —
empty home page, draft content not loading).

## Run the project

All commands run from the **repository root**.

| Command | What it does |
|---------|----------------|
| `pnpm dev` | Starts **all** dev tasks via Turborepo (www, blog, studio). |
| `pnpm dev:www` | Next.js main site → [http://localhost:3000](http://localhost:3000) |
| `pnpm dev:blog` | Blog → [http://localhost:3003](http://localhost:3003) (default port **3003**; set `PORT` to override) |
| `pnpm dev:studio` | Sanity Studio → [http://localhost:3333](http://localhost:3333) |

Production-style serve (after build): each app has `pnpm run start` inside its workspace; from root, build first then start the app you need.

To **deploy hosted Studio**, use `pnpm --filter @pakfactory/studio run deploy` (Sanity CLI; requires project auth).

**Vercel:** use `pnpm install --frozen-lockfile` if the dashboard still defaults to npm.

**www rebuild preview:** until launch, public **pakfactory.com** stays on `main`. QA the rebuild on the non-prod `pakfactory-com` project’s stable git-branch alias: [pakfactory-com-git-www-new-release-pakfactory-projects-00b54385.vercel.app](https://pakfactory-com-git-www-new-release-pakfactory-projects-00b54385.vercel.app). Keep that project’s Production Branch on `main` (case-studies origin). See [`AGENTS.md`](./AGENTS.md) § www rebuild trunk.

### Blog app on Vercel (`apps/blog`, PROD-1496)

Create a **separate** Vercel project from `apps/www`. Build/install commands are defined in [`apps/blog/vercel.json`](apps/blog/vercel.json) (Vercel reads them when Root Directory is `apps/blog`).

| Dashboard setting | Value |
|-------------------|--------|
| Root Directory | `apps/blog` |
| Include files outside root | **On** (required for `packages/*`) |
| Framework Preset | Next.js (or leave auto) |
| Node.js Version | **20.x** |
| Install Command | *(from `vercel.json`)* `pnpm install --frozen-lockfile` |
| Build Command | *(from `vercel.json`)* `pnpm turbo run build --filter=@pakfactory/blog` |
| Output Directory | *(default)* `.next` |
| Development Command | `pnpm dev` (optional; local only) |

**Production environment variables (minimum):**

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | your project id |
| `NEXT_PUBLIC_SANITY_DATASET` | `development` (local dev; use `production` on Vercel prod) |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-09-25` |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | hosted Studio URL |
| `SANITY_API_READ_TOKEN` | viewer token |
| `NEXT_PUBLIC_SITE_URL` | Blog deployment origin (e.g. `https://blog.pakfactory.com`) |

**Domains:** point the blog Vercel project at your blog hostname (e.g. `blog.pakfactory.com`). Routes are at **/** on that host, not under `/blog/`.

**Deploy:** push to the linked branch — Vercel runs install → turbo build (including `@pakfactory/seo`, `@pakfactory/sanity`, `@pakfactory/ui` typecheck per `turbo.json`) → Next.js deploy. No custom `start` command on Vercel.

## Build, lint, and typecheck

| Command | What it does |
|---------|----------------|
| `pnpm build` | Builds all workspaces. |
| `pnpm build:www` / `build:blog` / `build:studio` | Builds a single app. |
| `pnpm lint` | Runs lint across the monorepo. |
| `pnpm typecheck` | Runs TypeScript checks (depends on upstream builds where configured in `turbo.json`). |

Turborepo passes through the Sanity-related `env` keys listed in `turbo.json` for `dev` and `build` so caching stays correct when those values change.

## App versions

Each app workspace has:

- `version` (semver)
- `versionCode` (incrementing internal code for release tracking)

Print current app versions from the repo root:

```bash
pnpm run versions:apps
```

## Content and data scripts

| Command | What it does |
|---------|----------------|
| `pnpm run migrate:product-single-refs` | Data migration helper in `@pakfactory/sanity`. |

Additional migration scripts may exist under `packages/sanity/scripts`; see `packages/sanity/package.json` for the full list.

## Clean

```bash
pnpm run clean
```

Removes build artifacts via Turbo and deletes root `node_modules` (re-run `pnpm install` afterward).

## License and access

This repository is **private**. Do not commit real tokens; keep secrets in `.env.local` (gitignored).
