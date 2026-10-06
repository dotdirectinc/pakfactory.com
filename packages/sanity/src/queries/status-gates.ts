/**
 * Status gates for every catalog GROQ query — the one place they are defined.
 *
 * Split out of `catalog.ts` so `sections.ts` can use them too: catalog.ts imports
 * PAGE_SECTIONS_PROJECTION from sections.ts, so sections.ts importing catalog.ts back
 * is a cycle that breaks module init. This file imports nothing. `catalog.ts`
 * re-exports all of it, so existing imports keep working.
 */

/**
 * ONE status vocabulary for the whole catalog (PROD-2845):
 *
 *   active            normal — page, listed, orderable
 *   coming-soon       a marketing state; what it shows differs by type, see below
 *   discontinued      page stays (indexable, "no longer available"), NOT listed, not orderable
 *   not-active        nothing anywhere; the document exists only to be referenced
 *   active-internal   nothing anywhere EITHER, but still works as structure — its
 *                     children keep their own status, it still answers as a catalog
 *                     filter, it is still a valid `basedOn` target
 *
 * This replaced `customerFacing` (product / line / style) and `hasPage` (solution).
 * `customerFacing` is GONE — do not reintroduce it, and do not add a second boolean
 * beside `status`: the whole point is that one field answers "is this offered, and how?".
 *
 * 🔴 EVERY GATE BELOW IS A WHITELIST. It names the states that ARE visible, never the
 * ones that are not. That is what let `not-active` and `active-internal` join the
 * vocabulary without touching the product gates at all — a value nobody whitelisted is
 * hidden by construction. Write `status != "not-active"` instead and the next value
 * added leaks to customers the day it is added.
 *
 * ⚠️ An UNSET status preserves each type's pre-PROD-2845 meaning, which is not the same
 * answer everywhere:
 *   product / line / style  unset reads as ACTIVE — it always has, and 13 production
 *                           lines still carry no status.
 *   solution                unset reads as NO PAGE — its predecessor `hasPage` defaulted
 *                           to false, so a term had to earn its page. See SOLUTION_ACTIVE.
 *   category / type         unset reads as ACTIVE — these had no gate at all before, so
 *                           an un-migrated document behaves exactly as it does today.
 */
export const LISTED_STATUS = /* groq */ `(!defined(status) || status in ["active", "coming-soon"])`;
export const HAS_PAGE_STATUS = /* groq */ `(!defined(status) || status in ["active", "coming-soon", "discontinued"])`;

/** A product can be ordered only while Active — coming-soon lists with a badge but cannot be bought. */
export const ORDERABLE_STATUS = /* groq */ `(!defined(status) || status == "active")`;

/**
 * A customization option with its own detail page in the library (PROD-2732).
 * Replaces `hasPage == true`, which merged into `appearsIn`.
 *
 * 🔴 Names the two values that DO have a page rather than excluding the one that
 * does not. An option whose `appearsIn` is unset — an import that has not run the
 * backfill, an API write — must read as "no page", and `appearsIn != "…-no-page"`
 * is the opposite expression for a missing value.
 *
 * ⚠️ Customization options no longer use LISTED_STATUS or HAS_PAGE_STATUS above.
 * Their status is Active / Not active only (PROD-2733), so they test
 * `status == "active"` directly. Those two constants belong to the product,
 * line, style and solution family, which keeps all three lifecycle values.
 */
export const HAS_DETAIL_PAGE = /* groq */ `appearsIn in ["configurable-with-page", "not-configurable-with-page"]`;

/**
 * Product LINES and STYLES are grouping pages, not products — so "listed" and "has a
 * page" come apart on them in BOTH directions, and PROD-2845 had to split the single
 * `LINE_STYLE_VISIBLE` that used to serve both:
 *
 *   active-internal   LISTED (it still answers as a catalog filter) but NO page.
 *                     This is how a specialty line like "Food Containers & Utensils"
 *                     keeps its products reachable while having no page of its own —
 *                     and it is why its children are NOT restricted (R4).
 *   discontinued      has a PAGE (kept indexable for search) but is NOT listed.
 *   coming-soon       neither. It appears in the nav as an unlinked signpost, which is
 *                     a chrome decision made in `catalog-visibility.ts`, not here.
 *
 * Picking the wrong one of these two is the easiest mistake to make in this file:
 * a route gated on LISTED 404s a discontinued line that should still rank, and a
 * listing gated on HAS_PAGE advertises a line nobody can browse into.
 */
export const LINE_STYLE_LISTED = /* groq */ `(!defined(status) || status in ["active", "active-internal"])`;

/** Both at once — listed AND has a page. The right gate for a LINK out to a line. */
export const LINE_STYLE_ACTIVE = /* groq */ `(!defined(status) || status == "active")`;
export const LINE_STYLE_HAS_PAGE = /* groq */ `(!defined(status) || status in ["active", "discontinued"])`;

/**
 * Solution / Solution Style — Active is the whole visible set.
 *
 * No `!defined(status)` arm, deliberately, and this is the one gate in the file that
 * omits it. `status` replaced `hasPage`, which defaulted to FALSE: a solution existed to
 * be tagged against and a page was what a term EARNED. An un-migrated solution must
 * therefore read as having no page, exactly as it did before.
 */
export const SOLUTION_ACTIVE = /* groq */ `status == "active"`;

/**
 * Customization Category / Type — these had NO off switch before PROD-2845, so an
 * un-migrated document keeps behaving as it does today rather than vanishing.
 */
export const CUSTOMIZATION_TAXONOMY_ACTIVE = /* groq */ `(!defined(status) || status == "active")`;

/**
 * A product's PARENTS — its styles (standard) or its solutions (inspiration) — and when
 * one counts as switched off. Richard + Eric, 2026-10-06, refining the sheet's R2:
 *
 *   1. Every parent off → the product is HIDDEN (no page, no listing). One parent is
 *      just the smallest case of "every". Extends R2's tail rule to standard products.
 *   2. The primary (`productStyle[0]` / `solutions[0]`) is FIXED. No fallback to the
 *      next parent — it also drives the registry's offer set, so substituting would
 *      make the page disagree with pricing.
 *   3. An off primary passes NO FAQs down (see PRODUCT_FAQS_INHERITED).
 *
 * "Off" is Coming soon or Not active. Discontinued keeps its page, so it stays on, and
 * Active (Internal) passes through (R4). For a solution only Active is on — it has no
 * Discontinued or Active (Internal), and unset means "never earned a page"
 * (SOLUTION_ACTIVE). Whitelists, per R6. Written against `@` so they slot into a
 * reference-array filter.
 */
export const PARENT_STYLE_ON = /* groq */ `(!defined(@->status) || @->status in ["active", "active-internal", "discontinued"])`;
export const PARENT_SOLUTION_ON = /* groq */ `@->status == "active"`;

/** The PRIMARY parent (fixed, `[0]`) is on — gates FAQ inheritance (rule 3). */
export const PRIMARY_STYLE_ON = /* groq */ `(!defined(productStyle[0]->status) || productStyle[0]->status in ["active", "active-internal", "discontinued"])`;
export const PRIMARY_SOLUTION_ON = /* groq */ `solutions[0]->status == "active"`;

/** Rule 1: at least one parent is on. Inspiration products are anchored by solutions, standard by styles. */
export const PRODUCT_HAS_PARENT_ON = /* groq */ `select(
    kind == "inspiration" => count(solutions[${PARENT_SOLUTION_ON}]) > 0,
    count(productStyle[${PARENT_STYLE_ON}]) > 0
  )`;

/**
 * R1 for products (exclusive parent): a STANDARD product is never more visible than its
 * one Product Line. Per the visibility sheet:
 *   Coming soon / Not active line → its products are hidden (no page, no listing).
 *   Discontinued line             → its products are at most Discontinued: the page
 *                                   stays, nothing lists, nothing is orderable.
 *   Active (Internal) line        → passes through (R4) — the point of the value.
 * Inspiration products are exempt: their line is borrowed through `basedOn` and their
 * anchor is their solutions (rule 1), so the line does not gate them here.
 */
export const PRODUCT_LINE_OPEN = /* groq */ `(kind == "inspiration" || !defined(productLine->status) || productLine->status in ["active", "active-internal"])`;
export const PRODUCT_LINE_HAS_PAGE = /* groq */ `(kind == "inspiration" || !defined(productLine->status) || productLine->status in ["active", "active-internal", "discontinued"])`;

/**
 * The status a customer sees: an Active or Coming-soon standard product under a
 * Discontinued line reads as Discontinued (R1), so the PDP shows the notice and the
 * request rail stays shut without the front end knowing about lines.
 */
export const PRODUCT_EFFECTIVE_STATUS = /* groq */ `"status": select(
    kind != "inspiration" && productLine->status == "discontinued" &&
      (!defined(status) || status in ["active", "coming-soon"]) => "discontinued",
    status
  )`;

/** Product gates = own status AND rule 1 AND R1. Use these, not the bare status gates, on products. */
export const PRODUCT_LISTED = /* groq */ `(${LISTED_STATUS} && ${PRODUCT_HAS_PARENT_ON} && ${PRODUCT_LINE_OPEN})`;
export const PRODUCT_HAS_PAGE = /* groq */ `(${HAS_PAGE_STATUS} && ${PRODUCT_HAS_PARENT_ON} && ${PRODUCT_LINE_HAS_PAGE})`;
export const PRODUCT_ORDERABLE = /* groq */ `(${ORDERABLE_STATUS} && ${PRODUCT_HAS_PARENT_ON} && ${PRODUCT_LINE_OPEN})`;

/**
 * Solution Style — Active only, same reasoning as SOLUTION_ACTIVE (it starts Not active
 * and has no Discontinued or Active (Internal)). Its own status was never read before:
 * only the parent solution was checked, so every new style had a live page.
 */
export const SOLUTION_STYLE_ACTIVE = /* groq */ `status == "active"`;

/**
 * R1 for customizations (exclusive parent): an option is never more visible than its
 * Type, and a Type never more visible than its Category. A Type or Category set to Not
 * active takes every option beneath it off the site — library, detail page and
 * configurator — whatever the options' own status says. A read rule; nothing is written
 * into the option. Mirrors CUSTOMIZATION_TAXONOMY_ACTIVE (unset stays visible: these
 * types had no off switch before PROD-2845).
 */
export const OPTION_TAXONOMY_ON = /* groq */ `((!defined(type->status) || type->status == "active") && (!defined(type->category->status) || type->category->status == "active"))`;

/** An option a customer can meet: its own status AND its Type and Category (R1). */
export const OPTION_ACTIVE = /* groq */ `(status == "active" && ${OPTION_TAXONOMY_ON})`;

/**
 * May www LINK to this document, as far as its PARENTS go? Projected as `parentsOn`
 * beside `status` wherever chrome links a curated document (nav, hero slides, finder
 * rail, catalog rows), and read by `isCatalogTargetVisible` — the document's own status
 * is checked there; this adds what the document alone cannot know:
 *   product          rule 1 (some parent on) + R1 (its line is open)
 *   productStyle     R1 — its line has a page, or the style page has no route
 *   solutionStyle    R1 — its solution is Active
 *   customizationType   R1 — its category is open
 *   customizationOption R1 — its type and category are open
 * Anything else is `true`. Evaluated in the document's own scope.
 */
export const LINK_PARENTS_ON = /* groq */ `select(
    _type == "product" => ${PRODUCT_HAS_PARENT_ON} && ${PRODUCT_LINE_OPEN},
    _type == "productStyle" => !defined(productLine->status) || productLine->status in ["active", "discontinued"],
    _type == "solutionStyle" => solution->status == "active",
    _type == "customizationType" => !defined(category->status) || category->status == "active",
    _type == "customizationOption" => ${OPTION_TAXONOMY_ON},
    true
  )`;
