#!/usr/bin/env node
/**
 * PROD-3212 — load the "Also called" synonyms onto productStyle.alsoKnownAs.
 *
 * `alsoKnownAs` shipped on Product Style in PROD-3206 and is read by the website
 * as of PROD-3207. It is empty on all 96 styles.
 *
 * The synonyms below were written while the 83 customer-facing style names were
 * being settled, as a staging column beside each name — the alternatives that
 * lost, plus the trade words people search instead. They had nowhere structured
 * to live until this field existed. 81 of the 83 carry at least one; 254 values
 * in all.
 *
 * ── Not vetted, and that is a decision ──────────────────────────────────────
 *
 * ⚠️ The column recorded what might reasonably sit UNDER a style, which is a
 * near but not identical question to what a style is also CALLED. Some entries
 * are wrong. They load as they stand, and the content team reads through them
 * afterwards (PROD-3213) — an imperfect list beats an empty field for site
 * search, and the wrong ones are easier to spot in the Studio beside the style
 * than in a spreadsheet.
 *
 * Five values are each claimed by two styles. They are loaded on both and
 * REPORTED at the end of the run, which is where the vetting pass starts:
 *
 *   slipcase, sleeve box   Tray & Sleeve Rigid Boxes · Two-Piece Cartons
 *   match box              Rigid Drawer Boxes · Two-Piece Cartons
 *   lid and base           Two-Piece Cartons · Corrugated Boxes with Lids
 *   roll end tuck top      Hinged Lid Cartons · Corrugated Mailer Boxes
 *
 * No value collides with the actual title of another style, which would have
 * been the worse problem. The script checks that too and refuses if it ever
 * becomes true.
 *
 * ── A TASK, not a migration ─────────────────────────────────────────────────
 *
 * It fills a field on documents that already exist rather than moving the
 * dataset from one shape to the next, so it lives in TASKS and the bulk runner
 * never sweeps it up.
 *
 * 🔴 It writes ONLY where `alsoKnownAs` is empty. Once the content team starts
 * editing these, a re-run must not undo their work — a style with any value in
 * the field is skipped and counted. That is what makes this safe to run twice.
 *
 * Matching is by TITLE, normalised the way `uniqueTaxonomyTitle` normalises:
 * lowercased, punctuation folded to spaces. There are no ids here on purpose —
 * ids differ per dataset, and the 83 titles are the same list the styles were
 * named from. 🔴 If any row matches zero styles, or more than one, the script
 * reports every mismatch and writes NOTHING. A partial load with a silent miss
 * is the failure worth preventing: nobody would notice three styles missing
 * from 81.
 *
 * The 13 Product Styles with no row here are all `active-internal` — Cups,
 * Utensils, Takeout Containers and the rest. No public page, so no alias line.
 * They are listed at the end as untouched, not as a gap.
 *
 * Drafts included (`perspective: 'raw'`), so publishing a stale draft cannot
 * restore an empty field.
 *
 * ⚠️ Four values is the guidance on this field, not a limit — PROD-3212 made it
 * a warning. Six styles carry five to seven and load in full; the Studio shows
 * a note on those and saves them.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/studio run seed:product-style-aliases -- --dataset development
 *   ...                                                               --dataset development --confirm
 *   ...                                                               --dataset production --confirm --yes-production
 *   ...                                                               --dataset development --verify
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:product-style-aliases -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Report which styles carry synonyms; writes nothing.`

const args = parseScriptArgs({ usage: USAGE, flags: ['verify'] })
const { confirm: apply, verify } = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

/**
 * The 83 customer-facing Product Style names and the synonyms recorded beside
 * them, grouped by product line in the order the names were settled.
 */
const STYLES = [

  // Rigid Boxes
  { title: "Book Style Rigid Boxes", aliases: [] },
  { title: "Clamshell Rigid Boxes", aliases: [] },
  { title: "Collapsible Rigid Boxes", aliases: ["foldable rigid box"] },
  { title: "Custom Shaped Rigid Boxes", aliases: ["die-cut rigid box"] },
  { title: "Double Door Rigid Boxes", aliases: ["French door box", "gate fold box"] },
  { title: "Hinged Lid Rigid Boxes", aliases: ["flip top box", "flip lid box"] },
  { title: "Magnetic Closure Rigid Boxes", aliases: ["magnetic gift box", "magnetic box"] },
  { title: "Multi-Tiered Rigid Gift Boxes", aliases: ["tiered gift box", "two-tier box", "layered gift box"] },
  { title: "Paper Tube Packaging", aliases: ["cardboard tube", "kraft tube", "rigid tube"] },
  { title: "Rigid Drawer Boxes", aliases: ["match box", "slide box", "sliding box"] },
  { title: "Rigid Window Boxes", aliases: ["clear window box"] },
  { title: "Shoulder Neck Rigid Boxes", aliases: ["shoulder box", "neck box", "collar box"] },
  { title: "Tray & Sleeve Rigid Boxes", aliases: ["slipcase", "sleeve box"] },
  { title: "Two-Piece Rigid Boxes", aliases: ["lid and base box", "telescope box"] },

  // Folding Cartons
  { title: "Carton Trays", aliases: ["simplex tray", "four corner tray", "Beers tray", "Brightwood tray", "paperboard tray"] },
  { title: "Custom Shaped Cartons", aliases: ["die-cut carton", "multi-panel box", "specialty carton"] },
  { title: "Display-Ready Cartons", aliases: ["counter display carton", "CDU", "easel back carton"] },
  { title: "Folder & Envelope Cartons", aliases: ["gusset folder", "wallet box", "document wallet", "fold-over box", "folder box"] },
  { title: "Gable Boxes", aliases: ["gable top box", "handle box"] },
  { title: "Hang Tab Cartons", aliases: ["hanger box", "five panel hanger", "hang tab", "euro slot"] },
  { title: "Hinged Lid Cartons", aliases: ["locking box", "mailer carton", "roll end tuck top", "RETT", "RETF", "lock cap"] },
  { title: "Lock Bottom Cartons", aliases: ["crash bottom", "auto-lock bottom", "1-2-3 bottom", "snap lock bottom"] },
  { title: "Packaging Sleeves", aliases: ["belly band", "box sleeve", "printed band", "cardboard sleeve", "sleeve wrap"] },
  { title: "Pillow Boxes", aliases: ["pillow pack"] },
  { title: "Seal-End Cartons", aliases: ["seal end", "glued end carton", "cereal box style"] },
  { title: "Tuck End Boxes", aliases: ["STE", "RTE", "straight tuck end", "reverse tuck end", "tuck top", "tuck and lock"] },
  { title: "Two-Piece Cartons", aliases: ["tray and sleeve", "sleeve box", "lidded tray", "lid and base", "match box", "drawer style", "slipcase"] },

  // Corrugated Boxes
  { title: "Corrugated Boxes with Lids", aliases: ["cardboard box with lid", "telescoping box", "lid and base"] },
  { title: "Corrugated Folders & Wraps", aliases: ["one piece folder", "OPF", "five panel folder", "book mailer"] },
  { title: "Corrugated Mailer Boxes", aliases: ["die-cut mailer", "roll end tuck top", "e-commerce box"] },
  { title: "Corrugated Shipping Boxes", aliases: ["shipping carton", "RSC", "regular slotted container"] },
  { title: "Corrugated Trays", aliases: ["cardboard tray", "display tray", "design style tray"] },

  // Box Inserts
  { title: "Cardboard Inserts", aliases: ["dividers", "partitions", "cell dividers", "corrugated partitions"] },
  { title: "Foam Inserts", aliases: ["EVA insert", "EPE insert", "PU foam insert", "ESD foam"] },
  { title: "Molded Pulp Inserts", aliases: ["molded fibre", "pulp tray", "wet press pulp"] },
  { title: "Plastic Tray Inserts", aliases: ["thermoformed tray", "vacuum formed tray", "cavity tray"] },

  // Retail & Promotional Bags
  { title: "Cotton & Canvas Tote Bags", aliases: ["jute tote", "burlap tote", "eco tote bag"] },
  { title: "Insulated Cooler Bags", aliases: ["thermal bag", "food delivery bag"] },
  { title: "Paper Merchandise Bags", aliases: ["flat paper bag", "SOS bag", "gusseted paper bag"] },
  { title: "Paper Shopping Bags", aliases: ["euro tote", "paper carrier bag", "retail bag"] },
  { title: "Reusable Shopping Bags", aliases: ["non-woven bag", "PP bag", "reusable grocery bag"] },

  // Fabric Gift Bags & Pouches
  { title: "Cotton & Canvas Pouches", aliases: ["muslin bag", "cotton drawstring pouch", "dust bag"] },
  { title: "Linen & Jute Bags", aliases: ["burlap bag", "hessian bag", "rustic favour bag"] },
  { title: "Organza Bags", aliases: ["sheer gift bag", "favour bag"] },
  { title: "Satin & Specialty Fabric Bags", aliases: ["silk drawstring bag", "faux leather pouch"] },
  { title: "Velvet & Suede Bags", aliases: ["velvet pouch", "jewelry pouch", "microfiber pouch"] },

  // Flexible Pouches
  { title: "Custom Shaped Pouches", aliases: ["die-cut pouch", "contour pouch"] },
  { title: "Flat Pouches", aliases: ["lay flat pouch", "pillow pouch", "3 side seal pouch"] },
  { title: "Spout Pouches", aliases: ["corner spout pouch", "top spout pouch"] },
  { title: "Stand Up Pouches", aliases: ["doypack", "doy pouch", "bottom gusset pouch"] },

  // Mailers
  { title: "Bubble & Padded Mailers", aliases: ["poly bubble mailer", "kraft bubble mailer", "padded envelope"] },
  { title: "Paper & Kraft Mailer Bags", aliases: ["paper mailing bag", "expandable kraft mailer"] },
  { title: "Poly Mailers", aliases: ["poly mailer bag", "courier bag"] },
  { title: "Rigid Mailers", aliases: ["rigid mailer envelope", "cardboard envelope mailer", "stay flat mailer"] },

  // Cardboard Displays
  { title: "Cardboard Pegboard Displays", aliases: ["peg hook display", "cardboard peg display", "spinner rack"] },
  { title: "Counter Displays", aliases: ["countertop display", "POP counter display", "dispenser box"] },
  { title: "Floor Displays", aliases: ["cardboard display stand", "dump bin", "end cap display"] },
  { title: "Pallet Displays", aliases: ["full pallet display", "half pallet display", "quarter pallet display"] },
  { title: "Shelf-Ready Packaging", aliases: ["retail ready packaging", "RRP", "SRP", "PDQ tray"] },

  // Tin Packaging
  { title: "Airtight Tins & Canisters", aliases: ["gasket tin", "plug lid tin", "double lid tin"] },
  { title: "Child-Resistant Tins", aliases: ["CR tin", "squeeze and turn tin", "push and turn tin"] },
  { title: "Custom Shaped Tins", aliases: ["embossed tin", "novelty tin", "heart shaped tin"] },
  { title: "Hinged Lid Tin Boxes", aliases: ["knuckle hinged tin", "flip top tin", "tin box with hinged lid"] },
  { title: "Rectangular & Square Tin Boxes", aliases: ["metal tin box", "square tin", "cube tin"] },
  { title: "Round & Cylinder Tin Cans", aliases: ["tin canister", "cylindrical tin", "round metal tin"] },
  { title: "Screw Top Metal Tins", aliases: ["twist lid tin", "screw cap tin", "threaded tin"] },

  // Packaging Labels
  { title: "Labels By Finish", aliases: ["embossed label", "foil stamped label", "soft-touch label", "spot UV"] },
  { title: "Labels By Shape", aliases: ["round label", "die-cut label", "oval label", "square label"] },
  { title: "Metallic & Foil Labels", aliases: ["gold foil label", "silver foil label", "metal sticker"] },
  { title: "Paper Labels", aliases: ["kraft label", "textured label", "uncoated label", "matte paper label"] },
  { title: "Plastic & Film Labels", aliases: ["BOPP label", "vinyl label", "waterproof label", "clear label"] },
  { title: "Product Labels", aliases: ["bottle label", "jar label", "box label", "QR code label"] },
  { title: "Security Labels", aliases: ["tamper proof label", "tamper evident label", "destructible label", "void sticker"] },

  // Stickers
  { title: "Paper Stickers", aliases: ["kraft sticker", "matte sticker", "writeable sticker"] },
  { title: "Plastic Stickers", aliases: ["vinyl sticker", "clear sticker", "waterproof sticker", "BOPP sticker"] },
  { title: "Specialty & Foil Stickers", aliases: ["holographic sticker", "glitter sticker", "chrome sticker", "glow in the dark"] },
  { title: "Stickers By Shape", aliases: ["die-cut sticker", "kiss-cut sticker", "circle sticker", "oval sticker"] },

  // Packaging Accessories
  { title: "Hang Tags", aliases: ["swing tag", "price tag", "product tag"] },
  { title: "Insert Cards", aliases: ["packaging insert", "thank you card", "product care card"] },
  { title: "Packaging Void Fillers", aliases: ["void fill", "box filler", "crinkle paper", "packing peanuts"] },
  { title: "Packing Tapes", aliases: ["custom tape", "box tape", "water activated tape"] },
  { title: "Ribbons", aliases: ["satin ribbon", "grosgrain ribbon", "woven logo ribbon"] },
  { title: "Tissue & Wrapping Paper", aliases: ["custom tissue paper", "kraft tissue", "washi paper"] },]

/**
 * Same normalisation `uniqueTaxonomyTitle` uses, so this script and the Studio's
 * duplicate rule agree on what counts as the same title. Ampersands and hyphens
 * fold to spaces, which is what makes "Folder & Envelope Cartons" match however
 * it was typed.
 */
function comparisonKey(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const label = (d) => `${d.title || d._id}${d.isDraft ? ' (draft)' : ''}`

async function main() {
  console.log('\n\u{1F3F7}\uFE0F   Seed productStyle.alsoKnownAs (PROD-3212)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const styles = await client.fetch(
    `*[_type == "productStyle"]{
       _id, title, alsoKnownAs, status,
       "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!styles.length) {
    console.log(`\u2705  Nothing to do \u2014 ${DATASET} holds no productStyle documents.\n`)
    return
  }

  // ── Resolve every row to exactly one style ────────────────────────────────
  const byKey = new Map()
  for (const s of styles) {
    const k = comparisonKey(s.title)
    byKey.set(k, [...(byKey.get(k) || []), s])
  }

  const resolved = []
  const unmatched = []
  const ambiguous = []
  for (const row of STYLES) {
    const hits = byKey.get(comparisonKey(row.title)) || []
    if (hits.length === 0) unmatched.push(row)
    else if (hits.length > 1) ambiguous.push({ row, hits })
    else resolved.push({ row, style: hits[0] })
  }

  if (unmatched.length || ambiguous.length) {
    console.error(`\u274c  ${unmatched.length + ambiguous.length} of ${STYLES.length} rows do not resolve to exactly one Product Style. NOTHING WRITTEN.\n`)
    unmatched.forEach((r) => console.error(`     no match    ${r.title}`))
    ambiguous.forEach(({ row, hits }) =>
      console.error(`     ${hits.length} matches  ${row.title}  \u2014 ${hits.map((h) => h._id).join(', ')}`),
    )
    console.error('\n    A title was renamed in the Studio, or two styles now share one. Fix the list or the data; do not part-load.')
    process.exit(1)
  }

  // ── A synonym must never be another style's title ─────────────────────────
  const titleKeys = new Set(styles.map((s) => comparisonKey(s.title)))
  const titleClashes = []
  for (const { row } of resolved) {
    for (const a of row.aliases) {
      const k = comparisonKey(a)
      if (titleKeys.has(k) && k !== comparisonKey(row.title)) titleClashes.push({ row, alias: a })
    }
  }
  if (titleClashes.length) {
    console.error(`\u274c  ${titleClashes.length} synonym(s) are the TITLE of a different Product Style. NOTHING WRITTEN.\n`)
    titleClashes.forEach(({ row, alias }) => console.error(`     "${alias}" listed on ${row.title}`))
    console.error('\n    Site search would send the same word to two pages. Decide which style owns it first.')
    process.exit(1)
  }

  const withAliases = resolved.filter(({ row }) => row.aliases.length > 0)
  const noAliases = resolved.filter(({ row }) => row.aliases.length === 0)
  const alreadyFilled = withAliases.filter(({ style }) => (style.alsoKnownAs || []).length > 0)
  const toWrite = withAliases.filter(({ style }) => !(style.alsoKnownAs || []).length)
  const untouched = styles.filter((s) => !STYLES.some((r) => comparisonKey(r.title) === comparisonKey(s.title)))

  if (verify) {
    console.log(`Checked ${styles.length} Product Style(s) against ${STYLES.length} rows.`)
    const missing = withAliases.filter(({ style }) => !(style.alsoKnownAs || []).length)
    if (!missing.length) {
      console.log(`\u2705  All ${withAliases.length} style(s) with synonyms carry them.\n`)
      return
    }
    console.error(`\u274c  ${missing.length} style(s) are still empty:`)
    missing.forEach(({ style }) => console.error(`     ${label(style)}`))
    process.exit(1)
  }

  const values = toWrite.reduce((n, { row }) => n + row.aliases.length, 0)
  console.log(`${styles.length} Product Style(s) on ${DATASET}, ${STYLES.length} rows in this seed:`)
  console.log(`   to fill                 ${toWrite.length}  (${values} values)`)
  console.log(`   already filled, skipped ${alreadyFilled.length}  (never overwritten)`)
  console.log(`   no synonyms recorded    ${noAliases.length}`)
  console.log(`   not in this seed        ${untouched.length}  (internal-only styles, left alone)`)

  if (alreadyFilled.length) {
    console.log('\n\u26a0\uFE0F  Skipped \u2014 these already hold a list somebody wrote:')
    alreadyFilled.forEach(({ style }) => console.log(`   \u2022 ${label(style)}`))
  }

  const overFour = toWrite.filter(({ row }) => row.aliases.length > 4)
  if (overFour.length) {
    console.log(`\n\u26a0\uFE0F  ${overFour.length} style(s) carry more than four. Loaded in full \u2014 the cap is a warning, not a limit (PROD-3212):`)
    overFour.forEach(({ row }) => console.log(`   \u2022 ${row.title}  (${row.aliases.length})`))
  }

  // ── A value on two styles is reported, never silently dropped ─────────────
  const owners = new Map()
  for (const { row } of resolved) {
    for (const a of row.aliases) {
      const k = comparisonKey(a)
      owners.set(k, [...(owners.get(k) || []), { title: row.title, alias: a }])
    }
  }
  const shared = [...owners.values()].filter((v) => v.length > 1)
  if (shared.length) {
    console.log(`\n\u26a0\uFE0F  ${shared.length} value(s) are claimed by two styles. Loaded on both \u2014 start the vetting pass (PROD-3213) here:`)
    shared.forEach((v) => console.log(`   \u2022 "${v[0].alias}"  \u2014 ${v.map((x) => x.title).join('  \u00b7  ')}`))
  }

  if (!toWrite.length) {
    console.log(`\n\u2705  Nothing to do \u2014 every style with synonyms already carries them.\n`)
    return
  }

  const tx = client.transaction()
  for (const { row, style } of toWrite) {
    tx.patch(style._id, (patch) => patch.set({ alsoKnownAs: row.aliases }))
  }

  if (!apply) {
    console.log(`\n${toWrite.length} patch(es) pending on ${DATASET}. DRY-RUN only \u2014 re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n\u270D\uFE0F   Wrote ${toWrite.length} patch(es) to ${DATASET}.`)

  // Read back by _id, not by title. `lower()` reads fine here, but a read-back
  // that re-derives its own target can agree with a wrong write; the ids are the
  // documents this run actually patched.
  const leftover = await client.fetch(
    `count(*[_id in $ids && !defined(alsoKnownAs)])`,
    { ids: toWrite.map(({ style }) => style._id) },
  )
  if (leftover > 0) {
    console.error(`\u274c  ${leftover} style(s) still have no synonyms. Re-run with --verify.`)
    process.exit(1)
  }
  console.log(`\u2705  Read back clean \u2014 ${withAliases.length} style(s) carry their synonyms.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
