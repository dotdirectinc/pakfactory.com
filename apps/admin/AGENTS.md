# apps/admin — PakFactory back office

Operational surface for www request data and internal staff login. Part of epic [PROD-2405](https://dotdirect.atlassian.net/browse/PROD-2405).

## What this app owns

- Internal staff sign-in (same login UI as www via `@pakfactory/auth-ui`)
- Read-only views of buyer requests scoped to the signed-in sales member (PROD-2417+)
- Operational data backed by the `pakfactory-web` Supabase project

## What this app does not own

- **Content editing** — Sanity Studio (`apps/studio`)
- **Buyer-facing marketing** — `apps/www`
- **Out-of-scope epic items** — e.g. PROD-2357 Customers, commissions, Zoho Books (see PROD-2405 epic description)

## Stack

Next.js 16, React 19, Tailwind 4, port **4000**. PR base: `www-new-release`.

## Packages

| Package | Role |
|---|---|
| `@pakfactory/domain` | Request types, internal account model, read adapters |
| `@pakfactory/supabase` | SSR Supabase client + session helpers |
| `@pakfactory/auth-ui` | Shared login UI (props-only) |
| `@pakfactory/ui` | Design tokens and primitives |

Does **not** depend on `@pakfactory/components` or `@pakfactory/sanity`.

## Mock-first data layer (wire-up later)

Until PROD-2414/PROD-2415 land, admin uses **real Supabase auth** with **mock** internal-account and request reads.

| `ADMIN_DATA_SOURCE` | Internal account | Requests |
|---|---|---|
| `mock` (default) | `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` env | Fixtures in `@pakfactory/domain` |
| `supabase` | `lib/adapters/supabase-internal-account.ts` (PROD-2415) | `lib/adapters/supabase-requests.ts` (PROD-2414/2415) |

**Wire-up contract:**

- **PROD-2415** — implement `createSupabaseInternalAccountAdapter()` (role + `zohoUserId` from Supabase; never `user_metadata`).
- **PROD-2414** — implement `createSupabaseRequestReadAdapter()` against the `requests` table + RLS.
- Flip `ADMIN_DATA_SOURCE=supabase` when both adapters are ready.

Factory: [`src/lib/adapters.ts`](src/lib/adapters.ts).

## Local dev

1. Root [`.env.local`](../../.env.local) must include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same `pakfactory-web` project as www) when testing real login.
2. Copy [`apps/admin/.env.example`](.env.example) to `apps/admin/.env.local` (or set vars in root `.env.local`).
3. Run `pnpm dev:admin` from the repo root → http://localhost:4000.

### Dev auth bypass (local UI only)

Set in `apps/admin/.env.local` — **never in production**:

```env
ADMIN_DEV_BYPASS=true
ADMIN_DEV_BYPASS_ZOHO_USER_ID=zoho-user-sales-1
```

Active only when `NODE_ENV=development`, `ADMIN_DEV_BYPASS=true`, and not `VERCEL_ENV=production`. Opens http://localhost:4000/requests without login; `/login` redirects home. Header shows **Dev Mode**. Logic: [`src/lib/auth/dev-bypass.ts`](src/lib/auth/dev-bypass.ts). Backend restores full auth on [PROD-2415](https://dotdirect.atlassian.net/browse/PROD-2415) in [`src/lib/auth/require-internal-user.ts`](src/lib/auth/require-internal-user.ts).

Without `ADMIN_DEV_BYPASS=true`, use real Supabase login: set `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` to `your-email@example.com:zoho-user-sales-1` and sign in on `/login`. Active `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in the repo root `.env.local` — run `pnpm env:staging` (or `pnpm env:prod`) if you only have `_STAGING` / `_PROD` suffixed keys.

## Troubleshooting

### Login page error: Supabase URL and Key required

Root `.env.local` may list `NEXT_PUBLIC_SUPABASE_URL_STAGING` without the active `NEXT_PUBLIC_SUPABASE_URL`. Apps read the unsuffixed keys only. Fix: `pnpm env:staging` from the repo root, then restart `pnpm dev:admin`. Or skip login for UI work with `ADMIN_DEV_BYPASS=true` in `apps/admin/.env.local`.

### HTTP 431 or redirect weirdness

**HTTP 431 (Request Header Fields Too Large)** usually means the browser is sending oversized `Cookie` headers. Admin and www share the same `localhost` Supabase cookies (port does not isolate cookies on localhost), so a prior redirect loop or a www buyer session can leave bloated `sb-*-auth-token*` chunks.

**Recovery (one-time):**

1. Chrome → DevTools → Application → Cookies → `http://localhost` → delete all entries (especially `sb-*-auth-token*`).
2. Or use an incognito window.
3. Restart `pnpm dev:admin` and open `http://localhost:4000/login` first.

Non-internal sessions are cleared via [`src/app/auth/sign-out/route.ts`](src/app/auth/sign-out/route.ts) (Route Handler), not in Server Components — `signOut()` during RSC render cannot write cookies.
