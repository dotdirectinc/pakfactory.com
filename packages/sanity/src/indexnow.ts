/**
 * IndexNow submission (PROD-2172) — notifies Bing/Yandex/etc. immediately on
 * publish/update/unpublish instead of waiting for a crawl. Shared by
 * apps/blog and apps/www so both webhook-driven revalidate routes submit
 * identically (normalize/dedupe/host-filter), rather than diverging.
 *
 * @see https://www.indexnow.org/documentation
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow's own limit — chunk any batch larger than this. */
const MAX_URLS_PER_REQUEST = 10_000;
/** Never let a slow/unreachable IndexNow endpoint block a webhook response. */
const REQUEST_TIMEOUT_MS = 5_000;

export type IndexNowSubmitOptions = {
  /** Bare host IndexNow expects, e.g. "pakfactory.com" (no scheme, no www). */
  host: string;
  /** The IndexNow API key from Sanity Global Settings. */
  key: string;
  /** Absolute URL to the {key}.txt verification file. */
  keyLocation: string;
  /** Absolute URLs to submit. Non-`host` URLs are dropped, not sent. */
  urls: string[];
};

export type IndexNowSubmitResult = {
  /** False only when every URL was filtered out (nothing to submit) or all requests failed. */
  ok: boolean;
  /** URLs actually sent, after normalize/dedupe/host-filter. */
  submitted: string[];
};

/** Strip www., strip the fragment, strip a trailing slash (except bare "/"). */
function normalizeIndexNowUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    url.hostname = url.hostname.replace(/^www\./, "");
    url.hash = "";
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function postBatch(
  body: { host: string; key: string; keyLocation: string; urlList: string[] },
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[indexnow] submit failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    // A Bing outage or network hiccup must never break a Sanity publish/revalidate flow.
    console.error("[indexnow] submit error", err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit one or more canonical URLs to IndexNow. Fire-and-forget by design —
 * callers should not let this block/fail a webhook response; errors are
 * logged, never thrown.
 */
export async function submitIndexNowUrls(
  options: IndexNowSubmitOptions,
): Promise<IndexNowSubmitResult> {
  const { host, key, keyLocation, urls } = options;

  const submitted = [
    ...new Set(
      urls
        .map(normalizeIndexNowUrl)
        .filter((u): u is string => u !== null)
        .filter((u) => {
          try {
            return new URL(u).hostname === host;
          } catch {
            return false;
          }
        }),
    ),
  ];

  if (submitted.length === 0 || !key) {
    return { ok: submitted.length === 0, submitted };
  }

  let allOk = true;
  for (let i = 0; i < submitted.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = submitted.slice(i, i + MAX_URLS_PER_REQUEST);
    const chunkOk = await postBatch({ host, key, keyLocation, urlList: chunk });
    allOk = allOk && chunkOk;
  }

  return { ok: allOk, submitted };
}
