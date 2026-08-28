# `@pakfactory/www` — ops memory

Human and agent runbook for the www rebuild. Binding contracts live in [`CLAUDE.md`](./CLAUDE.md).

## Vercel

| Item | Value |
| ---- | ----- |
| Project | `pakfactory-com` (PakFactory's Projects team) |
| Production branch | **`main`** (live pakfactory.com stays on current www until launch) |
| Rebuild trunk | **`www-new-release`** |
| Stakeholder staging | [staging.pakfactory.com](https://staging.pakfactory.com) — preview deployment of `www-new-release`, Vercel Authentication required |
| QA git-branch alias | See root [`AGENTS.md`](../../AGENTS.md) § www rebuild trunk |

Staging is **never indexable** — `X-Robots-Tag: noindex, nofollow` on non-production + `robots.txt` disallow. Vercel auth wall is the primary gate.

## Local dev

```bash
pnpm dev:www    # http://localhost:3003
pnpm build:www && pnpm --filter @pakfactory/www start   # port 3000
```

## Environment

1. Copy root [`.env.example`](../../.env.example) → `.env.local` at repo root
2. Optional www overrides: copy [`apps/www/.env.example`](./.env.example) → `apps/www/.env.local`
3. `next.config.ts` calls `loadEnvConfig(repoRoot, …, forceReload: true)` — root vars win over app-level cache

**Minimum for local www:**

- Sanity: `NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`
- Supabase (auth): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**www-specific** (see `.env.example`): `SANITY_REVALIDATE_SECRET`, `WWW_DISABLE_INDEXING`, backend proxy secrets.

When adding a new env var, update **both** `.env.example` and `turbo.json` `@pakfactory/www#build` env list.

## Sanity revalidate

- Webhook target: `/api/revalidate`
- Secret: `SANITY_REVALIDATE_SECRET` (Bearer or `?secret=`)

## Auth emails

Supabase email template setup: [`docs/auth-emails/README.md`](./docs/auth-emails/README.md)

## Cross-app local ports

| App | Dev URL |
| --- | ------- |
| www | http://localhost:3003 |
| blog | http://localhost:3004 |
| admin | http://localhost:4000 |
| studio | http://localhost:3333 |

Studio presentation preview should use www **3003** for `SANITY_STUDIO_PREVIEW_URL_WWW`.

## Deploy handoff

Use skill **deploy-www-release** (root `CLAUDE.md`) for Jira AC comment → push → PR `--base www-new-release`.
