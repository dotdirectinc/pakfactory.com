# Performance baseline (PROD-2760)

One command reproduces the baseline tables posted on [PROD-2752](https://dotdirect.atlassian.net/browse/PROD-2752) against any deploy. Re-run it after major merges and post `summary.md` as a comment on the Epic.

```bash
pnpm --filter @pakfactory/www perf:baseline --base https://staging.pakfactory.com
pnpm --filter @pakfactory/www perf:baseline --base http://localhost:3000 --skip-lighthouse
```

`--base` is required, and an unknown flag stops the run. The script is [`scripts/perf-baseline.mjs`](../scripts/perf-baseline.mjs); its header lists every option.

## What it measures

| Step | What | Skip with |
| --- | --- | --- |
| Crawl | `/`, the links on it, and the links on those pages (depth 2, up to `--max-urls`, default 400), each fetched twice. Records status, TTFB, compressed and HTML size, `cache-control`, `x-vercel-cache`. Ends with a 404 probe. | `--skip-crawl` |
| RSC | The payload size of each measured page with an `RSC: 1` request. | `--skip-rsc` |
| Media | Sanity images in the page markup (`src`, `srcset`, `poster`) without size parameters, and the size of every referenced MP4. | `--skip-media` |
| Lighthouse 13 | Mobile and `--preset=desktop` runs on the 14 baseline pages (`--pages a,b,…` to override). Uses `npx lighthouse@13` and the local Chrome. Runs one at a time, about 40 s each: about 20 minutes for the 14 default pages (28 runs). | `--skip-lighthouse` |

Output goes to `<os tmp>/pf-perf-baseline/<timestamp>/` (or `--out <dir>`): `summary.md`, `results.json` and the raw Lighthouse reports.

## Staging is password-protected

Set `VERCEL_AUTOMATION_BYPASS_SECRET` to the project's **Protection Bypass for Automation** secret (Vercel → pakfactory-com → Settings → Deployment Protection). The script sends it as the `x-vercel-protection-bypass` header, to Lighthouse through a temporary file, and never prints it. Never use the staging login password for automated runs.

## Reading the numbers

- **Concurrency is capped at 3.** Higher rates trip the Vercel firewall (`403`, `x-vercel-mitigated: deny`), and those pages then measure the block page.
- **Lighthouse runs are single samples.** Mobile scores move about ±5 points run to run, so compare medians, not single pages.
- **Locally there is no `x-vercel-cache`.** Read the `s-maxage` count instead. On Vercel the reverse holds: it strips `s-maxage` from the response, so read the `HIT` count.
- **Staging uses the `development` dataset.** Re-run against production data at cutover.
