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
| “Run `pnpm seed:blog-dev` to fix the homepage.” | Refuse autonomous seed/content writes; may edit schemas or tell the human which command to run manually ([`AGENTS.md`](./AGENTS.md) § Sanity content — agent guardrails). |

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** (see root `package.json` `engines`)
- **pnpm 9.15.0** — enable via Corepack: `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- A [Sanity](https://www.sanity.io/) project (project ID, dataset, and API tokens as below)

## Setup

1. **Clone** the repository and install dependencies from the **repository root**:

   ```bash
   pnpm install
   ```

2. **Environment variables** — copy the example file and fill in your Sanity (and optional registry) values:

   ```bash
   cp .env.example .env.local
   ```

   Root `.env.example` documents every variable. At minimum for local development you typically need:

   - `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`
   - `NEXT_PUBLIC_SANITY_STUDIO_URL` (e.g. `http://localhost:3333`)
   - `SANITY_API_READ_TOKEN` — viewer token so draft content can load in dev on the Next apps
   - For Studio: `SANITY_STUDIO_PREVIEW_URL` (e.g. `http://localhost:3000`) and matching `SANITY_STUDIO_*` project/dataset if you do not rely solely on `NEXT_PUBLIC_*` names
   - `SANITY_API_WRITE_TOKEN` — **only** for scripts that write to the dataset (`pnpm run seed:demo`, migrations)

   **Where `.env.local` lives**

   - **`apps/www`** loads env from the **repository root** (see `apps/www/next.config.ts`).
   - **`apps/studio`** reads **`apps/studio/.env.local`** when you run `pnpm dev:studio` (Vite does not use root `.env.local` automatically). Keep `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` in sync with root — e.g. `8293wrxp` + `development` after `pnpm seed`.
   - **`apps/blog`** — root `.env.local` via `next.config.ts` (`loadEnvConfig`), plus **`apps/blog/.env.local`** for overrides (port, Sanity copy). See [`apps/blog/.env.example`](apps/blog/.env.example) and [`apps/blog/memory.md`](apps/blog/memory.md) (local dev / empty home troubleshooting).
   - **`packages/sanity`** scripts load **repo root** `.env.local`.

   Optional (premium shadcn studio registry): `EMAIL` and `LICENSE_KEY` as in `.env.example`.

## Run the project

All commands run from the **repository root**.

| Command | What it does |
|---------|----------------|
| `pnpm dev` | Starts **all** dev tasks via Turborepo (www, blog, studio). |
| `pnpm dev:www` | Next.js main site → [http://localhost:3000](http://localhost:3000) |
| `pnpm dev:blog` | Blog → [http://localhost:3003](http://localhost:3003) (default port **3003**; set `PORT` to override) |
| `pnpm seed:blog-dev` | Extra blog test posts + industries into Sanity **`development`** (after full studio seed) |
| `pnpm dev:studio` | Sanity Studio → [http://localhost:3333](http://localhost:3333) |

Production-style serve (after build): each app has `pnpm run start` inside its workspace; from root, build first then start the app you need.

To **deploy hosted Studio**, use `pnpm --filter @pakfactory/studio run deploy` (Sanity CLI; requires project auth).

**Vercel:** use `pnpm install --frozen-lockfile` if the dashboard still defaults to npm.

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
| `pnpm run seed:demo` | Seeds demo documents (requires `SANITY_API_WRITE_TOKEN` and project/dataset env). |
| `pnpm run migrate:product-single-refs` | Data migration helper in `@pakfactory/sanity`. |

Additional migration scripts may exist under `packages/sanity/scripts`; see `packages/sanity/package.json` for the full list.

## Clean

```bash
pnpm run clean
```

Removes build artifacts via Turbo and deletes root `node_modules` (re-run `pnpm install` afterward).

## License and access

This repository is **private**. Do not commit real tokens; keep secrets in `.env.local` (gitignored).
