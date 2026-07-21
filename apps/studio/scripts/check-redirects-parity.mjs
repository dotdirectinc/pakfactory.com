/**
 * check-redirects-parity.mjs — PROD-2157 parity / regression check.
 *
 * Reads every ACTIVE `redirect` doc from the dataset and verifies its `from`
 * actually redirects to the right destination PATH on the live site — the
 * "shadow-mode parity" AC, run as an ongoing regression guard. Read-only (HEAD
 * requests only; never mutates Sanity or the site).
 *
 * Comparison is PATH-only (ignores host / www-vs-apex and any chain endpoint
 * differences) so it flags genuine misses, not cosmetic origin differences:
 *   OK          redirect fires (3xx) to the expected `to` path
 *   OK-GONE     `behaviour: gone` doc returns 410
 *   NOT-FIRING  returns 200 — the redirect isn't resolving (regression) OR the
 *               doc is a no-op self-referential rule the engine correctly skips
 *   REDIR-DIFF  redirects, but to a different path than `to` (chain / drift)
 *   BAD / ERROR unexpected status or request failure
 *
 * Usage:
 *   node scripts/check-redirects-parity.mjs                 # checks prod
 *   REDIRECT_CHECK_ORIGIN=https://staging… node scripts/check-redirects-parity.mjs
 * Exits non-zero when any doc is not OK/OK-GONE (so CI can gate on it).
 */

const PROJECT =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production'
const API = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'
const ORIGIN = (process.env.REDIRECT_CHECK_ORIGIN || 'https://pakfactory.com').replace(/\/$/, '')
const CONCURRENCY = 10

const query = `*[_type=="redirect" && isActive==true]{from,to,behaviour,matchType,channel}`
const qUrl = `https://${PROJECT}.apicdn.sanity.io/v${API}/data/query/${DATASET}?query=${encodeURIComponent(query)}`

const pathOf = (u) => {
  try {
    return new URL(u, ORIGIN).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return null
  }
}
const normPath = (p) => (p ? (p.startsWith('/') ? p : `/${p}`).replace(/\/+$/, '') || '/' : null)

async function check(r) {
  if (!r.from) return { ...r, verdict: 'SKIP-NOFROM' }
  const target = `${ORIGIN}${r.from}`
  let status
  let loc
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(target, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 redirect-parity-check' },
    })
    clearTimeout(timer)
    status = res.status
    loc = res.headers.get('location')
  } catch (e) {
    return { ...r, status: 'ERR', loc: String(e?.name ?? e), verdict: 'ERROR' }
  }

  if (r.behaviour === 'gone') {
    return { ...r, status, loc, verdict: status === 410 ? 'OK-GONE' : `BAD-GONE(${status})` }
  }
  if (status === 200) return { ...r, status, loc, verdict: 'NOT-FIRING(200)' }
  if (status >= 300 && status < 400) {
    const gotPath = pathOf(loc)
    const wantPath = normPath(r.to)
    return { ...r, status, loc, gotPath, wantPath, verdict: gotPath === wantPath ? 'OK' : 'REDIR-DIFF' }
  }
  return { ...r, status, loc, verdict: `BAD(${status})` }
}

const rows = (await (await fetch(qUrl)).json()).result ?? []
const results = []
for (let i = 0; i < rows.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(rows.slice(i, i + CONCURRENCY).map(check))))
}

const bucket = (v) => v.replace(/\(.*/, '')
const summary = {}
for (const r of results) summary[bucket(r.verdict)] = (summary[bucket(r.verdict)] ?? 0) + 1

console.log(`\nchecked ${results.length} active redirects against ${ORIGIN}\n`)
console.log('summary:', JSON.stringify(summary))

const bad = results.filter((r) => !['OK', 'OK-GONE'].includes(r.verdict))
if (bad.length) {
  console.log(`\n${bad.length} not OK:\n`)
  for (const r of bad) {
    console.log(`  [${r.verdict}] ${r.from}  [${r.channel ?? '—'}]`)
    console.log(`      want ${r.wantPath ?? r.to ?? '(gone)'}  |  got ${r.gotPath ?? r.loc ?? '—'} (status ${r.status})`)
  }
}
process.exit(bad.length ? 1 : 0)
