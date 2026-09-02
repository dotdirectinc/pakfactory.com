# `@pakfactory/studio` — ops memory

Human and agent runbook for Sanity Studio. Binding contracts: [`CLAUDE.md`](./CLAUDE.md).

## Environment

Studio reads **`apps/studio/.env.local`** — not repo root (Vite).

```bash
cp apps/studio/.env.example apps/studio/.env.local
```

Keep `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` in sync with root `.env.local`.

| Var | Local example |
| --- | ------------- |
| `SANITY_STUDIO_PROJECT_ID` | your project id |
| `SANITY_STUDIO_DATASET` | `development` |
| `SANITY_STUDIO_PREVIEW_URL_WWW` | `http://localhost:3003/case-studies/` |
| `SANITY_STUDIO_PREVIEW_URL_BLOG` | `http://localhost:3004/` |

When adding vars consumed at build time, also update `turbo.json`.

## Dataset convention

- **Local dev:** `development`
- **Vercel production:** `production` on Next apps; Studio deploy uses project config

Full switching runbook: [`scripts/sanity/RUNBOOK.md`](../../scripts/sanity/RUNBOOK.md)

## Commands

| Task | Command |
| ---- | ------- |
| Dev | `pnpm dev:studio` → http://localhost:3333 |
| Deploy hosted Studio | `pnpm --filter @pakfactory/studio run deploy` |
| Full blog seed | `pnpm --filter @pakfactory/studio run seed` |
| Blog singleton pages | `pnpm --filter @pakfactory/studio run seed:blog-singleton-pages` |

**Agents do not run seeds** — humans only ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

## Presentation preview

1. Run `pnpm dev:www` (port 3003) and/or `pnpm dev:blog` (port 3004)
2. Run `pnpm dev:studio`
3. Studio → Presentation tool → pick www or blog location

## Cross-app local ports

| App | Dev URL |
| --- | ------- |
| www | http://localhost:3003 |
| blog | http://localhost:3004 |
| admin | http://localhost:4000 |
| studio | http://localhost:3333 |

## `.env.production`

Committed file contains public `SANITY_STUDIO_*` preview URLs for deployed Studio builds. **Deploy trap:** shell-exported `localhost` vars from `.env.local` can override `.env.production` during deploy — extract only the token when deploying.
