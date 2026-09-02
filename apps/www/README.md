# `@pakfactory/www`

Main PakFactory **marketing site rebuild** — Next.js 16 App Router, Sanity-backed catalog, buyer auth (Supabase), RFQ flows, and case studies.

> **AI agents:** Read [`CLAUDE.md`](./CLAUDE.md) and repo [`AGENTS.md`](../../AGENTS.md) first. Ops and Vercel detail: [`memory.md`](./memory.md).

## Quick start

From the **repo root**:

```bash
pnpm install
cp .env.example .env.local    # fill Sanity + Supabase values
pnpm dev:www                  # http://localhost:3003
```

Optional www-specific overrides: [`apps/www/.env.example`](./.env.example) → `apps/www/.env.local`.

Usually also run Studio for content editing:

```bash
pnpm dev:studio    # http://localhost:3333
```

| Task | Command |
| ---- | ------- |
| Dev server | `pnpm dev:www` |
| Production build | `pnpm build:www` |
| Type-check | `pnpm --filter @pakfactory/www typecheck` |
| Lint | `pnpm --filter @pakfactory/www lint` |

## PR base

www rebuild work merges into **`www-new-release`**, not `staging`. See root [`AGENTS.md`](../../AGENTS.md) § www rebuild trunk.

## Where to look next

- [`CLAUDE.md`](./CLAUDE.md) — routes, auth, SEO, component rules
- [`memory.md`](./memory.md) — Vercel, staging, env troubleshooting
- [`docs/auth-emails/README.md`](./docs/auth-emails/README.md) — Supabase email templates
