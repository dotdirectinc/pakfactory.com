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
| “Write a new blog post page.” | Use `@pakfactory/sanity/queries`, `getSanityClient()`, Server Components; metadata + `Article` JSON-LD per [`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md). |
| “Run `npm run dev`.” | Use **`pnpm dev`** from the repo root. |

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
   - **`apps/studio`** and **`packages/sanity`** scripts expect variables available in the shell or in a root `.env.local` when you use tooling that loads it.
   - **`apps/blog`** uses Next.js default resolution: place **`apps/blog/.env.local`** with the same Sanity variables, or keep a single root `.env.local` and symlink/copy into `apps/blog` so both apps see the same config.

   Optional (premium shadcn studio registry): `EMAIL` and `LICENSE_KEY` as in `.env.example`.

## Run the project

All commands run from the **repository root**.

| Command | What it does |
|---------|----------------|
| `pnpm dev` | Starts **all** dev tasks via Turborepo (www, blog, studio). |
| `pnpm dev:www` | Next.js main site → [http://localhost:3000](http://localhost:3000) |
| `pnpm dev:blog` | Blog → [http://localhost:3001/blog](http://localhost:3001/blog) (`PORT=4000` overrides port only) |
| `pnpm dev:studio` | Sanity Studio → [http://localhost:3333](http://localhost:3333) |

Production-style serve (after build): each app has `pnpm run start` inside its workspace; from root, build first then start the app you need.

To **deploy hosted Studio**, use `pnpm --filter @pakfactory/studio run deploy` (Sanity CLI; requires project auth).

**Vercel:** use `pnpm install --frozen-lockfile` if the dashboard still defaults to npm.

### Blog app on Vercel (`apps/blog`, PROD-1496)

Create a **separate** Vercel project from `apps/www`:

| Setting | Value |
|---------|--------|
| Root Directory | `apps/blog` |
| Include files outside root | **On** (workspace packages) |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build --filter=@pakfactory/blog` |
| Node.js | 20.x |

**Production env (minimum):** `NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SITE_URL=https://pakfactory.com/blog`.

**Domains:** attach `blog.pakfactory.com` on this project; [`apps/blog/vercel.json`](apps/blog/vercel.json) 301s that host to `https://pakfactory.com/blog`. Serve `/blog` on the marketing domain via this deployment’s `basePath` (or www rewrites to the blog project).

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
