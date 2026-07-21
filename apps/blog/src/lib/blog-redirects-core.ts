/**
 * Runtime-agnostic core for CMS redirect resolution — no `server-only`,
 * `next/cache`, or `@sanity/client` imports, so it runs in **both** the edge
 * proxy (which resolves redirects before any route matches) and the RSC
 * fallback in `blog-redirects.ts`.
 *
 * PROD-2157 — pattern-capable engine. A row's `matchType` selects how `from` is
 * matched; `behaviour` maps to the status the engine emits:
 *   exact   — one URL (hash map, O(1))
 *   prefix  — starts-with; optionally keep the tail (`appendMatchedTail`)
 *   phrase  — the path CONTAINS a substring
 * Precedence: exact → longest prefix → phrase (by priority, then longest).
 * `behaviour`: permanent 301 / temporary 302 / gone 410 (falls back to legacy
 * `type` 301/302). Regex is intentionally NOT handled here — capture-group rules
 * stay dev-owned in next.config.
 */

export type RedirectStatus = 301 | 302 | 410;

export type RedirectRow = {
  from?: string;
  to?: string;
  type?: string; // legacy 301/302
  matchType?: string; // exact | prefix | phrase
  behaviour?: string; // permanent | temporary | gone
  priority?: number;
  appendMatchedTail?: boolean;
};

/** Resolved target. `destination` is a PUBLIC path (keeps `/blog`/`/case-studies`) or absolute URL; `null` for 410 gone. */
export type ResolvedRedirect = { destination: string | null; status: RedirectStatus };

type ExactRule = { destination: string | null; status: RedirectStatus };
type PrefixRule = {
  fromKey: string; // base-path-less, normalized
  to: string | null; // public destination (null when gone)
  status: RedirectStatus;
  appendTail: boolean;
  priority: number;
};
type PhraseRule = {
  needle: string; // base-path-less substring (NOT trailing-normalized)
  destination: string | null;
  status: RedirectStatus;
  priority: number;
};

export type RedirectRuleset = {
  exact: Record<string, ExactRule>;
  prefix: PrefixRule[];
  phrase: PhraseRule[];
};

const isAbsolute = (s: string): boolean => /^https?:\/\//i.test(s);

/** Leading slash, no trailing slash (except root). Mirrors how paths are stored/served. */
export function normalizePath(path: string): string {
  const withLead = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withLead.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * App-internal (base-path-less) form of a public path. Editors author redirects
 * as public URLs that include the `/blog` base path (`/blog/old-post/`), but the
 * app matches base-path-less pathnames — so matching and chain following key off
 * the stripped form.
 */
export function stripBasePath(path: string, basePath: string): string {
  if (!basePath) return path;
  if (path === basePath || path === `${basePath}/`) return "/";
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
}

/** Absolute redirect URL. Internal targets are joined to the site origin so the base path is never double-prepended. */
export function toAbsolute(destination: string, siteUrl: string): string {
  if (isAbsolute(destination)) return destination;
  return `${siteUrl.replace(/\/$/, "")}${destination.startsWith("/") ? "" : "/"}${destination}`;
}

/** Map a row's `behaviour` (falling back to legacy `type`) to the HTTP status. */
function rowStatus(row: RedirectRow): RedirectStatus {
  if (row.behaviour === "gone") return 410;
  if (row.behaviour === "temporary") return 302;
  if (row.behaviour === "permanent") return 301;
  return row.type === "302" ? 302 : 301;
}

/** Compile the active rows into an exact map + sorted prefix/phrase lists. */
export function buildRuleset(rows: RedirectRow[], basePath: string): RedirectRuleset {
  const exact: Record<string, ExactRule> = {};
  const prefix: PrefixRule[] = [];
  const phrase: PhraseRule[] = [];

  for (const row of rows) {
    if (!row?.from) continue;
    const status = rowStatus(row);
    const gone = status === 410;
    if (!gone && !row.to) continue; // non-gone needs a destination
    const matchType = row.matchType ?? "exact";
    const priority = typeof row.priority === "number" ? row.priority : 10;
    const publicDest = gone ? null : isAbsolute(row.to!) ? row.to! : normalizePath(row.to!);

    if (matchType === "prefix") {
      const fromKey = normalizePath(stripBasePath(row.from, basePath));
      prefix.push({ fromKey, to: publicDest, status, appendTail: row.appendMatchedTail === true, priority });
    } else if (matchType === "phrase") {
      const needle = stripBasePath(row.from, basePath);
      if (!needle) continue;
      phrase.push({ needle, destination: publicDest, status, priority });
    } else {
      // exact
      const fromKey = normalizePath(stripBasePath(row.from, basePath));
      if (!gone) {
        const destKey = isAbsolute(publicDest!)
          ? publicDest!
          : normalizePath(stripBasePath(publicDest!, basePath));
        if (destKey === fromKey) continue; // self-referential → skip (avoids loops)
      }
      exact[fromKey] = { destination: publicDest, status };
    }
  }

  // Precedence within a type: longest prefix first (then priority); phrase by
  // priority then longest needle.
  prefix.sort((a, b) => b.fromKey.length - a.fromKey.length || a.priority - b.priority);
  phrase.sort((a, b) => a.priority - b.priority || b.needle.length - a.needle.length);
  return { exact, prefix, phrase };
}

/** One match pass: exact → longest prefix → phrase. `key` is normalized; `rawPath` keeps its trailing slash for phrase `contains`. */
function matchOnce(
  ruleset: RedirectRuleset,
  key: string,
  rawPath: string,
): ResolvedRedirect | null {
  const e = ruleset.exact[key];
  if (e) return { destination: e.destination, status: e.status };

  for (const p of ruleset.prefix) {
    if (key === p.fromKey || key.startsWith(`${p.fromKey}/`)) {
      if (p.status === 410) return { destination: null, status: 410 };
      const tail = key.slice(p.fromKey.length); // "" or "/rest"
      const dest = p.appendTail ? normalizePath(`${p.to}${tail}`) : p.to;
      return { destination: dest, status: p.status };
    }
  }

  for (const ph of ruleset.phrase) {
    if (rawPath.includes(ph.needle)) {
      return { destination: ph.destination, status: ph.status };
    }
  }
  return null;
}

/**
 * Resolve a redirect for `pathname` (base-path-less, as the app sees it).
 * Matches exact → longest-prefix → phrase, then follows internal EXACT chains up
 * to `maxHops` with a loop guard, downgrading to a temporary redirect if any hop
 * is temporary. A `gone` match at any point returns 410. Returns null on no match.
 */
export function resolveRedirect(
  ruleset: RedirectRuleset,
  pathname: string,
  basePath: string,
  maxHops = 5,
): ResolvedRedirect | null {
  const rawPath = stripBasePath(pathname, basePath);
  const startKey = normalizePath(rawPath);

  const first = matchOnce(ruleset, startKey, rawPath);
  if (!first) return null;
  if (first.status === 410) return { destination: null, status: 410 };
  if (first.destination == null) return null; // defensive (non-gone always has a dest)

  let destination = first.destination;
  let temporary = first.status === 302;
  const seen = new Set<string>([startKey]);

  for (let i = 0; i < maxHops; i++) {
    if (isAbsolute(destination)) break; // external target — stop following
    const key = normalizePath(stripBasePath(destination, basePath));
    if (seen.has(key)) break;
    seen.add(key);
    const next = ruleset.exact[key]; // chain-follow via exact rules only
    if (!next) break;
    if (next.status === 410) return { destination: null, status: 410 };
    if (next.destination == null) break;
    temporary = temporary || next.status === 302;
    destination = next.destination;
  }

  return { destination, status: temporary ? 302 : 301 };
}
