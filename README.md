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

**Stack highlights:** Node **≥ 20.19**, npm **10.9.2**, Turborepo, Next.js **16**, React **19**, Sanity **5**, Tailwind **4**.

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** (see root `package.json` `engines`)
- npm **10.x** (repo pins `packageManager`; use `corepack enable` if you rely on Corepack)
- A [Sanity](https://www.sanity.io/) project (project ID, dataset, and API tokens as below)

## Setup

1. **Clone** the repository and install dependencies from the **repository root**:

   ```bash
   npm install
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
   - `SANITY_API_WRITE_TOKEN` — **only** for scripts that write to the dataset (`npm run seed:demo`, migrations)

   **Where `.env.local` lives**

   - **`apps/www`** loads env from the **repository root** (see `apps/www/next.config.ts`).
   - **`apps/studio`** and **`packages/sanity`** scripts expect variables available in the shell or in a root `.env.local` when you use tooling that loads it.
   - **`apps/blog`** uses Next.js default resolution: place **`apps/blog/.env.local`** with the same Sanity variables, or keep a single root `.env.local` and symlink/copy into `apps/blog` so both apps see the same config.

   Optional (premium shadcn studio registry): `EMAIL` and `LICENSE_KEY` as in `.env.example`.

## Run the project

All commands run from the **repository root**.

| Command | What it does |
|---------|----------------|
| `npm run dev` | Starts **all** dev tasks via Turborepo (www, blog, studio). |
| `npm run dev:www` | Next.js main site → [http://localhost:3000](http://localhost:3000) |
| `npm run dev:blog` | Blog → [http://localhost:3001](http://localhost:3001) |
| `npm run dev:studio` | Sanity Studio → [http://localhost:3333](http://localhost:3333) |

Production-style serve (after build): each app has `npm run start` inside its workspace; from root, build first then start the app you need.

To **deploy hosted Studio**, use `npm run deploy --workspace=@pakfactory/studio` (Sanity CLI; requires project auth).

## Build, lint, and typecheck

| Command | What it does |
|---------|----------------|
| `npm run build` | Builds all workspaces. |
| `npm run build:www` / `build:blog` / `build:studio` | Builds a single app. |
| `npm run lint` | Runs lint across the monorepo. |
| `npm run typecheck` | Runs TypeScript checks (depends on upstream builds where configured in `turbo.json`). |

Turborepo passes through the Sanity-related `env` keys listed in `turbo.json` for `dev` and `build` so caching stays correct when those values change.

## App versions

Each app workspace has:

- `version` (semver)
- `versionCode` (incrementing internal code for release tracking)

Print current app versions from the repo root:

```bash
npm run versions:apps
```

## Content and data scripts

| Command | What it does |
|---------|----------------|
| `npm run seed:demo` | Seeds demo documents (requires `SANITY_API_WRITE_TOKEN` and project/dataset env). |
| `npm run migrate:product-single-refs` | Data migration helper in `@pakfactory/sanity`. |

Additional migration scripts may exist under `packages/sanity/scripts`; see `packages/sanity/package.json` for the full list.

## Clean

```bash
npm run clean
```

Removes build artifacts via Turbo and deletes root `node_modules` (re-run `npm install` afterward).

## License and access

This repository is **private**. Do not commit real tokens; keep secrets in `.env.local` (gitignored).

Testing vercel dev hook