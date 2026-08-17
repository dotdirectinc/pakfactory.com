/**
 * PROD-2284 content-model cutover — the five dataset phases.
 *
 * Phase 1  PROD-2300  Delete the Certifications branch
 * Phase 2  PROD-2310  Delete the orphaned blogSettings
 * Phase 3  PROD-2311  Discard abandoned drafts (three survive)
 * Phase 4  PROD-2298  Use cases become Solutions
 * Phase 5  PROD-2299  Retire Industry and Industry Category
 * Phase 6  —          Post-flight verification (read-only)
 *
 * Written by an agent, run by a human — AGENTS.md § Sanity content:
 * "Humans own document writes: Studio UI, explicit seed runs, approved
 * migrations, and dataset export/import."
 *
 * ── Running it ──────────────────────────────────────────────────────────────
 *
 * From the repo root:
 *
 *   pnpm --filter @pakfactory/sanity migrate:cutover --dataset development --phase 1
 *
 * Or from packages/sanity:
 *
 *   pnpm migrate:cutover --dataset development --phase 1
 *
 * Dry run is the DEFAULT — there is no --dry-run flag. Nothing is written
 * until you add --confirm:
 *
 *   ... --dataset development --phase 1 --confirm
 *
 * --phase takes 1 · 2 · 3 · 4 · 5 · verify.
 *
 * The dataset is never inherited from the environment — an earlier run of this
 * cutover was lost partly because scripts here default to "production" when
 * SANITY_STUDIO_DATASET is unset. Here it is required and explicit, and
 * production additionally demands --yes-production.
 *
 * Every phase runs its own pre-flight and REFUSES to execute when a count
 * disagrees with the runbook. Re-running a completed phase is safe: each one
 * is idempotent.
 *
 * Env: SANITY_API_WRITE_TOKEN (Editor token). Project id from
 * NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID.
 */

import { createClient, type SanityClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

// ── Arguments ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
}
const has = (name: string) => args.includes(`--${name}`);

const dataset = flag("dataset");
const phase = flag("phase");
const confirm = has("confirm");
const yesProduction = has("yes-production");

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const token = process.env.SANITY_API_WRITE_TOKEN || "";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

// ── The runbook's constants ──────────────────────────────────────────────────

/** Drafts that must survive phase 3. Two are live work; one is a system doc. */
const DRAFT_KEEPERS = [
  "drafts.74ade9ae-70d2-4d14-9110-91aef90ba55b", // Woah Dough case study
  "drafts.cd28b5fc-d116-4866-abfd-0095167d55b7", // PFAS-Free post
];

const CERTIFICATION_IDS = ["type-fsc", "type-recyclable", "cat-cert"]; // children first

/**
 * Use case → the Solution that replaces it. Deterministic ids so the repoint
 * is verifiable and the phase can be re-run without creating duplicates.
 * `uc-sub-box` and `uc-travel` are deliberately absent — both are dropped.
 */
const SOLUTIONS = [
  { from: "uc-retail", _id: "sol-retail-shelf-packaging", internalTitle: "Retail Shelf Packaging", slug: "retail-shelf-packaging", solutionType: "channel" },
  { from: "uc-gift", _id: "sol-gift-packaging", internalTitle: "Gift Packaging", slug: "gift-packaging", solutionType: "use-case" },
  { from: "uc-launch", _id: "sol-product-launch", internalTitle: "Product Launch", slug: "product-launch", solutionType: "use-case" },
  { from: "uc-ecomm", _id: "sol-ecommerce-shipping", internalTitle: "E-commerce Shipping", slug: "ecommerce-shipping", solutionType: "channel" },
] as const;

const USE_CASE_IDS = ["uc-retail", "uc-gift", "uc-launch", "uc-ecomm", "uc-sub-box", "uc-travel"];

/** Industry → the Solution slug that replaces it. Only these two are referenced. */
const INDUSTRY_TO_SOLUTION_SLUG: Record<string, string> = {
  "ind-apparel": "apparel-fashion",
  "ind-cosmetics": "beauty-cosmetics",
};

/** Expected pre-flight counts, verified against production on 2026-08-14. */
const EXPECTED = {
  certificationDocs: 3,
  blogSettingsDocs: 2,
  draftsToDiscard: 28,
  useCaseDocs: 6,
  productsTagged: 29,
  productsRefIndustry: 3,
  industryDocs: 10,
  industryCategoryDocs: 8,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

let client: SanityClient;
let mutated = 0;

const log = (msg: string) => console.log(msg);
const step = (msg: string) => console.log(`  ${confirm ? "→" : "·"} ${msg}`);

function refuse(reason: string): never {
  console.error(`\n✗ STOP — ${reason}`);
  console.error("  Nothing was written. Re-check against the runbook before continuing.");
  process.exit(1);
}

function expect(label: string, actual: number, wanted: number) {
  if (actual !== wanted) {
    refuse(`${label} is ${actual}, expected ${wanted}.`);
  }
  log(`  ✓ ${label}: ${actual}`);
}

/** Nothing is written unless --confirm. */
async function commit(describe: string, run: () => Promise<unknown>) {
  step(describe);
  if (!confirm) return;
  await run();
  mutated += 1;
}

const ref = (_ref: string) => ({ _type: "reference" as const, _ref });

// ── Phase 1 · Certifications ─────────────────────────────────────────────────

async function phase1() {
  log("\nPhase 1 · Delete the Certifications branch (PROD-2300)");

  const found = await client.fetch<string[]>(
    `*[_id in $ids]._id`,
    { ids: [...CERTIFICATION_IDS, ...CERTIFICATION_IDS.map((id) => `drafts.${id}`)] },
  );
  if (found.length === 0) {
    log("  ✓ already done — nothing to delete");
    return;
  }
  expect("Certification documents", found.length, EXPECTED.certificationDocs);

  const outside = await client.fetch<{ _id: string }[]>(
    `*[references($ids) && !(_id in $ids)]{_id}`,
    { ids: [...CERTIFICATION_IDS] },
  );
  if (outside.length > 0) {
    refuse(`${outside.length} document(s) outside the branch reference it: ${outside.map((d) => d._id).join(", ")}`);
  }
  log("  ✓ no inbound references from outside the branch");

  // Children before parents, so nothing dangles mid-transaction.
  for (const id of CERTIFICATION_IDS) {
    await commit(`delete ${id}`, () => client.delete(id).catch(() => undefined));
    await commit(`delete drafts.${id}`, () => client.delete(`drafts.${id}`).catch(() => undefined));
  }
}

// ── Phase 2 · blogSettings ───────────────────────────────────────────────────

async function phase2() {
  log("\nPhase 2 · Delete the orphaned blogSettings (PROD-2310)");

  const found = await client.fetch<string[]>(
    `*[_type == "blogSettings" || _id in ["blogSettings","drafts.blogSettings"]]._id`,
  );
  if (found.length === 0) {
    log("  ✓ already done — nothing to delete");
    return;
  }
  expect("blogSettings documents", found.length, EXPECTED.blogSettingsDocs);

  const inbound = await client.fetch<number>(`count(*[references("blogSettings")])`);
  if (inbound > 0) refuse(`${inbound} document(s) still reference blogSettings.`);
  log("  ✓ no inbound references");

  // The five split settings singletons are what actually serve the blog.
  const split = await client.fetch<string[]>(
    `*[_id in ["postSettings","categorySettings","topicSettings","authorSettings","pageSettings"]]._id`,
  );
  expect("split settings singletons intact", split.length, 5);

  await commit("delete drafts.blogSettings", () => client.delete("drafts.blogSettings").catch(() => undefined));
  await commit("delete blogSettings", () => client.delete("blogSettings").catch(() => undefined));

  if (confirm) {
    log("  ! close any Studio tab open on this document — an autosave recreates it");
  }
}

// ── Phase 3 · Abandoned drafts ───────────────────────────────────────────────

async function phase3() {
  log("\nPhase 3 · Discard abandoned drafts (PROD-2311)");

  const candidates = await client.fetch<{ _id: string; _type: string; title?: string }[]>(
    `*[
      _id in path("drafts.**")
      && !defined(*[_id == string::split(^._id, "drafts.")[1]][0]._id)
      && _type != "sanity.previewUrlSecret"
      && !(_id in $keepers)
    ]{_id, _type, title} | order(_id asc)`,
    { keepers: DRAFT_KEEPERS },
  );

  if (candidates.length === 0) {
    log("  ✓ already done — no abandoned drafts remain");
    return;
  }
  expect("drafts to discard", candidates.length, EXPECTED.draftsToDiscard);

  // Anything unarchived and unrecognised is somebody's work in progress.
  const KNOWN_UNARCHIVED = [
    "drafts.480532fb-3657-4a5f-b0bf-50318850b8fa", // product titled "Test"
    "drafts.d4a4ba96-252d-4cc5-8a6f-60a6cbb1ef1f", // empty capabilityCategory
  ];
  const surprises = candidates.filter(
    (d) => !d.title?.startsWith("[ARCHIVED]") && !KNOWN_UNARCHIVED.includes(d._id),
  );
  if (surprises.length > 0) {
    refuse(
      `${surprises.length} draft(s) are neither [ARCHIVED] nor known one-offs — somebody has started real work:\n    ` +
        surprises.map((d) => `${d._id} · ${d._type} · ${d.title ?? "(untitled)"}`).join("\n    "),
    );
  }
  log("  ✓ every candidate is [ARCHIVED] or a known one-off");

  const keepersPresent = await client.fetch<string[]>(`*[_id in $keepers]._id`, { keepers: DRAFT_KEEPERS });
  expect("keeper drafts present before deleting", keepersPresent.length, DRAFT_KEEPERS.length);

  for (const doc of candidates) {
    await commit(`discard ${doc._id}`, () => client.delete(doc._id));
  }
}

// ── Phase 4 · Use cases become Solutions ─────────────────────────────────────

type TaggedProduct = { _id: string; title?: string; useCases?: { _ref: string }[] };

async function phase4() {
  log("\nPhase 4 · Use cases become Solutions (PROD-2298)");

  const tagged = await client.fetch<TaggedProduct[]>(
    `*[_type == "product" && count(useCases) > 0]{_id, title, useCases} | order(_id asc)`,
  );
  const useCaseDocs = await client.fetch<number>(`count(*[_type in ["useCase"]])`);

  if (tagged.length === 0 && useCaseDocs === 0) {
    log("  ✓ already done");
    return;
  }
  expect("use case documents", useCaseDocs, EXPECTED.useCaseDocs);
  expect("products carrying use-case tags", tagged.length, EXPECTED.productsTagged);

  const collisions = await client.fetch<{ _id: string }[]>(
    `*[_type == "solution" && slug.current in $slugs && !(_id in $ids)]{_id}`,
    { slugs: SOLUTIONS.map((s) => s.slug), ids: SOLUTIONS.map((s) => s._id) },
  );
  if (collisions.length > 0) {
    refuse(`Solution slug already taken by ${collisions.map((c) => c._id).join(", ")}`);
  }
  log("  ✓ all four Solution slugs are free");

  // 1 · the four Solutions. createIfNotExists keeps this re-runnable.
  for (const s of SOLUTIONS) {
    await commit(`create solution ${s._id} (${s.solutionType})`, () =>
      client.createIfNotExists({
        _id: s._id,
        _type: "solution",
        internalTitle: s.internalTitle,
        solutionType: s.solutionType,
        slug: { _type: "slug", current: s.slug },
      }),
    );
  }

  // 2 · repoint. `set` rather than `append` so a re-run cannot duplicate.
  const byUseCase = new Map(SOLUTIONS.map((s) => [s.from, s._id]));
  for (const product of tagged) {
    const solutionIds = [
      ...new Set(
        (product.useCases ?? [])
          .map((u) => byUseCase.get(u._ref))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    await commit(
      `repoint ${product._id} → ${solutionIds.length ? solutionIds.join(", ") : "(none — sub-box only)"}`,
      () =>
        client
          .patch(product._id)
          .set({ solutions: solutionIds.map((id) => ({ ...ref(id), _key: id })) })
          .unset(["useCases"])
          .commit({ autoGenerateArrayKeys: false }),
    );
  }

  // 3 · the use cases themselves, once nothing points at them.
  for (const id of USE_CASE_IDS) {
    await commit(`delete ${id}`, () => client.delete(id).catch(() => undefined));
    await commit(`delete drafts.${id}`, () => client.delete(`drafts.${id}`).catch(() => undefined));
  }
}

// ── Phase 5 · Industry and Industry Category ─────────────────────────────────

type IndustryProduct = { _id: string; industries?: { _ref: string }[] };

async function phase5() {
  log("\nPhase 5 · Retire Industry and Industry Category (PROD-2299)");

  const products = await client.fetch<IndustryProduct[]>(
    `*[_type == "product" && (count(industries) > 0 || count(industryCategories) > 0)]{_id, industries} | order(_id asc)`,
  );
  const industryDocs = await client.fetch<number>(`count(*[_type == "industry"])`);
  const industryCategoryDocs = await client.fetch<number>(`count(*[_type == "industryCategory"])`);

  if (products.length === 0 && industryDocs === 0 && industryCategoryDocs === 0) {
    log("  ✓ already done");
    return;
  }
  expect("products referencing the taxonomy", products.length, EXPECTED.productsRefIndustry);
  expect("industry documents", industryDocs, EXPECTED.industryDocs);
  expect("industryCategory documents", industryCategoryDocs, EXPECTED.industryCategoryDocs);

  // Target Solutions are resolved by slug — they predate this cutover.
  const targets = await client.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "solution" && slug.current in $slugs]{_id, "slug": slug.current}`,
    { slugs: Object.values(INDUSTRY_TO_SOLUTION_SLUG) },
  );
  const bySlug = new Map(targets.map((t) => [t.slug, t._id]));
  for (const slug of Object.values(INDUSTRY_TO_SOLUTION_SLUG)) {
    if (!bySlug.has(slug)) refuse(`Solution "${slug}" not found — cannot repoint onto it.`);
  }
  log("  ✓ both replacement Solutions exist");

  // 1 · repoint, merging with anything phase 4 already put on `solutions`.
  for (const product of products) {
    const existing = await client.fetch<{ solutions?: { _ref: string }[] }>(
      `*[_id == $id][0]{solutions}`,
      { id: product._id },
    );
    const add = (product.industries ?? [])
      .map((i) => bySlug.get(INDUSTRY_TO_SOLUTION_SLUG[i._ref]))
      .filter((id): id is string => Boolean(id));
    const merged = [
      ...new Set([...(existing.solutions ?? []).map((s) => s._ref), ...add]),
    ];
    await commit(
      `repoint ${product._id} → ${merged.join(", ")}`,
      () =>
        client
          .patch(product._id)
          .set({ solutions: merged.map((id) => ({ ...ref(id), _key: id })) })
          // Industry Categories are Industry × Product Line crossings. They map
          // to nothing — the demand sits on the two axes, not the intersection.
          .unset(["industries", "industryCategories"])
          .commit({ autoGenerateArrayKeys: false }),
    );
  }

  // 2 · children before parents.
  const categories = await client.fetch<string[]>(`*[_type == "industryCategory"]._id`);
  for (const id of categories) {
    await commit(`delete ${id}`, () => client.delete(id));
  }
  const industries = await client.fetch<string[]>(`*[_type == "industry"]._id`);
  for (const id of industries) {
    await commit(`delete ${id}`, () => client.delete(id));
  }
}

// ── Phase 6 · Post-flight (read-only) ────────────────────────────────────────

async function postflight() {
  log("\nPost-flight verification (read-only)");

  const r = await client.fetch<Record<string, number>>(`{
    "useCaseDocs": count(*[_type == "useCase"]),
    "industryDocs": count(*[_type == "industry"]),
    "industryCategoryDocs": count(*[_type == "industryCategory"]),
    "productsStillTagged": count(*[_type == "product" && (count(useCases) > 0 || count(industries) > 0 || count(industryCategories) > 0)]),
    "certificationDocs": count(*[_id in ["cat-cert","type-fsc","type-recyclable"]]),
    "blogSettingsDocs": count(*[_type == "blogSettings"]),
    "newSolutions": count(*[_type == "solution" && solutionType in ["channel","use-case"]]),
    "productsWithSolutions": count(*[_type == "product" && count(solutions) > 0]),
    "keepersSurviving": count(*[_id in ${JSON.stringify(DRAFT_KEEPERS)}])
  }`);

  const checks: [string, number, number][] = [
    ["useCase documents", r.useCaseDocs, 0],
    ["industry documents", r.industryDocs, 0],
    ["industryCategory documents", r.industryCategoryDocs, 0],
    ["products still tagged", r.productsStillTagged, 0],
    ["certification documents", r.certificationDocs, 0],
    ["blogSettings documents", r.blogSettingsDocs, 0],
    ["new Solutions", r.newSolutions, 4],
    ["products carrying Solutions", r.productsWithSolutions, 29],
    ["keeper drafts surviving", r.keepersSurviving, 2],
  ];

  let failed = 0;
  for (const [label, actual, wanted] of checks) {
    const ok = actual === wanted;
    if (!ok) failed += 1;
    log(`  ${ok ? "✓" : "✗"} ${label}: ${actual} (expected ${wanted})`);
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} check(s) failed. The schema PR removing these fields must NOT be raised yet.`);
    process.exit(1);
  }
  log("\n✓ All post-flight checks pass. The schema PR removing the retired fields can now be raised.");
}

// ── Entry point ──────────────────────────────────────────────────────────────

const PHASES: Record<string, () => Promise<void>> = {
  "1": phase1,
  "2": phase2,
  "3": phase3,
  "4": phase4,
  "5": phase5,
  verify: postflight,
};

const KNOWN_FLAGS = ["dataset", "phase", "confirm", "yes-production"];

async function main() {
  // A silently-ignored flag is how you think you asked for a dry run and got
  // something else. `--dry-run` in particular reads as meaningful and isn't.
  const unknown = args.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (unknown.length > 0) {
    refuse(
      `Unknown flag(s): ${unknown.join(", ")}. Valid flags: ${KNOWN_FLAGS.map((f) => `--${f}`).join(", ")}.` +
        (unknown.includes("--dry-run") ? "\n  Dry run is the default — omit the flag, and add --confirm to write." : ""),
    );
  }

  if (!projectId) refuse("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID.");
  if (!dataset) {
    refuse('Missing --dataset. It is never inherited from the environment: pass "--dataset development" explicitly.');
  }
  if (!phase || !PHASES[phase]) {
    refuse(`Missing or unknown --phase. One of: ${Object.keys(PHASES).join(", ")}.`);
  }
  if (dataset === "production" && !yesProduction) {
    refuse('Refusing to touch "production" without --yes-production. Export the dataset first.');
  }
  if (confirm && !token) {
    refuse("Missing SANITY_API_WRITE_TOKEN (Editor token with write access).");
  }

  // `raw` is load-bearing, not a default worth inheriting. Under the client's
  // "drafts" perspective a draft overrides its published twin and the pair
  // reads as one document — so `drafts.prod-mag-001` and `prod-mag-001` collapse,
  // 29 tagged products present as 26, and a patch would reach only one of them.
  // Every count in the runbook was verified raw; the migration must match.
  client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
    perspective: "raw",
  });

  log(`${projectId} / ${dataset} · phase ${phase} · ${confirm ? "EXECUTING" : "DRY RUN (add --confirm to write)"}`);

  await PHASES[phase]();

  if (phase === "verify") return;
  log(
    confirm
      ? `\n✓ Phase ${phase} complete. ${mutated} mutation(s) committed. Re-run with --phase verify when all five are done.`
      : `\nDry run only — nothing was written. Add --confirm to execute.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
