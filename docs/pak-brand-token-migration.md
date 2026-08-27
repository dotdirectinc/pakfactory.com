# Pak Brand Token Migration — `packages/ui/globals.css`

**Date:** 2026-07-07 · **Owner:** dev@dotdirect.ca · **Status:** planned (not yet applied)

Carries the **PakFactory design system** from the POC kit (`blog-poc`, Figma "PakFactory Design System" `LJd5ggIgh7fog2lE2FEhZt`) into the monorepo's shared UI package. Source of truth for the change: `blog-poc/src/index.css` + `blog-poc/DESIGN.md`.

**Single file changes:** `packages/ui/src/globals.css`. Both `apps/blog` and `apps/www` inherit it automatically. No component files change as part of this migration (component follow-ups are listed separately in §6).

---

## 1. Scope & guardrails

**In scope (light theme only):** the `:root` color palette, new brand token families, the shadow ladder, `--radius`, `--layout-max`, and the gradient dashed-dieline block.

**Explicitly NOT touched (decisions locked 2026-07-07):**

| Area | Decision |
|---|---|
| `.dark { … }` block | **Untouched.** Dark mode stays exactly as-is (remains the default). Do not recolor dark. |
| `--chart-1..5` | **Untouched.** The POC defines no chart colors; keep the existing five. |
| `--card` / `--popover` | Stay `#ffffff` (POC keeps white cards on cream page — matches today). |
| `--destructive` | Unchanged (`oklch(0.577 0.245 27.325)` — identical in both). |
| Raw hex in components | **Not allowed.** The POC's `bg-[#27272a]` CTA exception is rejected — map to a predefined token instead (§6). |

**Approved, intentional broad effects:** `--primary` becomes forest green site-wide (every `bg-primary`/`ring` flips from neutral-black to green); `--border` retints warm across both apps.

---

## 2. Revert point (do this FIRST)

This migration is a single-file, single-commit change so it can be reverted cleanly.

1. Ensure the working tree is clean, then **commit the current `globals.css` as the baseline** (or note the current HEAD SHA of the file):

   ```bash
   cd /Users/ibabo/Documents/repo/pakfactory.com
   git log -1 --format='%H  %s' -- packages/ui/src/globals.css
   # ← record this SHA below as the pre-migration baseline
   ```

   **Pre-migration baseline SHA:** `__________________________` (fill in)

2. Apply the whole migration as **one commit** (e.g. `feat(ui): adopt Pak brand tokens (light theme)`), so revert = one command:

   ```bash
   git revert <migration-commit-sha>          # preferred: keeps history
   # or, to restore just the file to baseline:
   git checkout <baseline-sha> -- packages/ui/src/globals.css
   ```

3. **Backup of the current light `:root` values** (restore reference if git isn't available) — see the "Current (revert to)" column in every table in §3–§5. Dark values are not listed because they are not being changed.

---

## 3. Color palette — light `:root` value swaps

Replace each value; keep the token **names** identical.

| Token | Current (revert to) | New (Pak brand) |
|---|---|---|
| `--background` | `#ffffff` | `#f4f1eb` — warm cream |
| `--foreground` | `rgb(10 10 10)` | `#1a1a1a` |
| `--card` | `rgb(255 255 255)` | `#ffffff` *(unchanged)* |
| `--card-foreground` | `rgb(10 10 10)` | `#1a1a1a` |
| `--popover` | `rgb(255 255 255)` | `#ffffff` *(unchanged)* |
| `--popover-foreground` | `rgb(10 10 10)` | `#1a1a1a` |
| `--primary` | `rgb(23 23 23)` | `#2b5f2d` — forest green |
| `--primary-foreground` | `rgb(250 250 250)` | `#ffffff` |
| `--secondary` | `rgb(245 245 245)` | `#ece8df` — warm beige |
| `--secondary-foreground` | `rgb(23 23 23)` | `#1a1a1a` |
| `--muted` | `rgb(245 245 245)` | `#ece8df` |
| `--muted-foreground` | `rgb(115 115 115)` | `#6e6e6e` |
| `--accent` | `rgb(245 245 245)` | `#ece8df` |
| `--accent-foreground` | `rgb(23 23 23)` | `#1a1a1a` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | *(unchanged)* |
| `--border` | `rgb(229 229 229)` | `#d4cfc4` — warm taupe |
| `--input` | `rgb(229 229 229)` | `#d4cfc4` |
| `--ring` | `#a3a3a3` | `#2b5f2d` — green |

**Sidebar slots (light):**

| Token | Current (revert to) | New |
|---|---|---|
| `--sidebar` | `rgb(250 250 250)` | `#f4f1eb` |
| `--sidebar-foreground` | `rgb(10 10 10)` | `#1a1a1a` |
| `--sidebar-primary` | `rgb(23 23 23)` | `#2b5f2d` |
| `--sidebar-primary-foreground` | `rgb(250 250 250)` | `#ffffff` |
| `--sidebar-accent` | `rgb(245 245 245)` | `#ece8df` |
| `--sidebar-accent-foreground` | `rgb(23 23 23)` | `#1a1a1a` |
| `--sidebar-border` | `rgb(229 229 229)` | `#d4cfc4` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `#2b5f2d` |

---

## 4. New brand token families (add to light `:root`)

None of these exist today — add them. Defined once in `:root` (they cascade into `.dark` too; acceptable for now — revisit dark-brand tinting later, out of scope).

```css
/* opacity/primary scale — green at 10–60% (soft fills, hover, focus rings) */
--opacity-primary-10: rgba(43, 95, 45, 0.10);
--opacity-primary-20: rgba(43, 95, 45, 0.20);
--opacity-primary-30: rgba(43, 95, 45, 0.30);
--opacity-primary-40: rgba(43, 95, 45, 0.40);
--opacity-primary-50: rgba(43, 95, 45, 0.50);
--opacity-primary-60: rgba(43, 95, 45, 0.60);

/* derived primary states */
--primary-hover: #245125;      /* primary −6% */
--primary-active: #1f4521;     /* primary −12% */

/* opacity/neutral scale — cool gray-blue (faded text, dividers, giant wordmark) */
--opacity-neutral-lighter: rgba(71, 72, 87, 0.10);
--opacity-neutral-main:    rgba(71, 72, 87, 0.30);
--opacity-neutral-darker:  rgba(71, 72, 87, 0.60);

/* primary gradient (Figma "primary-gradient" fill) */
--primary-gradient: linear-gradient(135deg, #2b5f2d 0%, #4a8a4d 100%);

/* primary-tinted shadow ladder */
--shadow-primary-2xs: 0 1px var(--opacity-primary-20);
--shadow-primary-xs:  0 1px 2px 0 var(--opacity-primary-20);
--shadow-primary-sm:  0 1px 3px 0 var(--opacity-primary-30), 0 1px 2px -1px var(--opacity-primary-30);
--shadow-primary-md:  0 4px 6px -1px var(--opacity-primary-30), 0 2px 4px -2px var(--opacity-primary-30);
--shadow-primary-lg:  0 10px 15px -3px var(--opacity-primary-40), 0 4px 6px -4px var(--opacity-primary-40);
--shadow-primary-xl:  0 20px 25px -5px var(--opacity-primary-40), 0 8px 10px -6px var(--opacity-primary-40);
--shadow-primary-2xl: 0 25px 50px -12px var(--opacity-primary-50);
```

> These are consumed as raw `var(--…)` (matching the POC, which does **not** register them in `@theme inline`). No `@theme` change needed for them. If we later want `bg-*`/`shadow-*` utilities for them, that's a separate follow-up.

---

## 5. Shadow ladder, radius, layout width

**Shadow ladder** — the current values are flattened (every step ≈ `0 1px 3px`). Replace the neutral ladder with the POC's real-elevation one. Keep the base `--shadow` (not present in POC) set equal to `--shadow-sm` so nothing referencing `--shadow` breaks.

| Token | Current (revert to) | New |
|---|---|---|
| `--shadow-2xs` | `0 1px 3px 0px rgb(0 0 0 / 0.05)` | `0 1px rgba(0,0,0,0.05)` |
| `--shadow-xs` | `0 1px 3px 0px rgb(0 0 0 / 0.05)` | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| `--shadow-sm` | `0 1px 3px …, 0 1px 2px -1px …` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` |
| `--shadow` | `0 1px 3px …, 0 1px 2px -1px …` | = `--shadow-sm` (keep) |
| `--shadow-md` | `0 1px 3px …, 0 2px 4px -1px …` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `--shadow-lg` | `0 1px 3px …, 0 4px 6px -1px …` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `--shadow-xl` | `0 1px 3px …, 0 8px 10px -1px …` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` |
| `--shadow-2xl` | `0 1px 3px 0px rgb(0 0 0 / 0.25)` | `0 25px 50px -12px rgba(0,0,0,0.25)` |

**Radius & layout:**

| Token | Current (revert to) | New | Effect |
|---|---|---|---|
| `--radius` | `0.625rem` (10px) | `0.875rem` (14px) | Rounder cards/buttons |
| `--layout-max` | `1536px` | `1280px` | Narrower dieline column (Figma 1280 inner) |

> `--layout-max` is consumed by `apps/blog/src/components/layout/page-dieline-section.tsx` (`max-w-[var(--layout-max)]`). Narrowing it moves the vertical dashed guides inward — confirm this matches the target on the wider archive/listing pages, not just Explore topics.

---

## 6. Dashed dieline block — port from POC

Today `page-dieline-section.tsx` uses **native** `border-dashed` (browser-default ~3px dashes, non-deterministic). The POC replaces it with **gradient-drawn 6px dash + 6px gap, 1px stroke**, identical across browsers, hooking the same `border-dashed` + `border-border` classes — so no component edit is needed; every existing dieline upgrades on import.

**Action:** append the full override block from `blog-poc/src/index.css` (the "Dashed dieline borders" section, ~lines 164–320) to `packages/ui/src/globals.css`. It covers `border-t/b/l/r/x/y`, the four-sided `.border`, and the composite combinations (`border-t.border-x`, etc.). The dashes use `var(--border)`, so they inherit the new warm taupe in light and the existing dark border in dark automatically.

---

## 7. Component-level follow-ups (NOT part of the globals.css commit)

Do these separately, after the token commit, when porting POC components:

- [ ] **No raw hex.** The POC's `bg-[#27272a]` CTA pill must become a predefined token — nearest semantic match is **`bg-foreground`** (`#1a1a1a`; note: slightly darker than `#27272a`, confirm with design). Never reintroduce the hardcoded hex.
- [ ] **Typography recipes** (from `DESIGN.md`): headings use **`font-semibold` (600) max — no `font-bold`** + `tracking-tight` + tight leading (`leading-none` / `leading-[1.1]`). Body is `text-base leading-7 text-muted-foreground`.
- [x] **Root font FIXED at 16px (done 2026-07-07).** The responsive root-font scaling (`17px @≥1600`, `18px @≥1920`) in `globals.css` was **commented out** (not deleted) to match the POC's fixed-16px system — it was making rem utilities (e.g. h2 `text-xl` = 20px) render 21.25/22.5px on wide monitors, mismatching `/topics` vs the POC. **Memory / future option:** re-enable the commented `@media` block if we later decide type should grow on large displays. Affects both apps.
- [ ] Audit any component using `bg-primary` for legibility now that primary is green (contrast of `--primary-foreground` #fff on green = OK; check hover/active use `--primary-hover`/`--primary-active`).

---

## 8. Execution checklist

- [ ] **0. Baseline** — clean tree; record pre-migration SHA in §2; branch e.g. `feat/ui-pak-brand-tokens`.
- [ ] **1. Light palette** — swap all values in §3 (root + sidebar). Names unchanged.
- [ ] **2. New families** — add the §4 block to `:root`.
- [ ] **3. Shadows** — replace ladder per §5; set `--shadow` = `--shadow-sm`.
- [ ] **4. Radius** — `--radius: 0.875rem`.
- [x] **5. Layout width** — `--layout-max: 1280px` (done 2026-07-07; briefly tried 1440 (artboard width) then set to **1280** to match the POC inner block exactly).
- [ ] **6. Dashed dieline** — append the gradient block from §6.
- [ ] **7. Guardrails** — confirm `.dark`, `--chart-1..5`, `--card`, `--popover`, `--destructive` are **unchanged** in the diff.
- [ ] **8. Commit** — single commit; record migration SHA in §2.
- [ ] **9. Verify** (below).
- [ ] **10. Follow-ups** — schedule §7 items (separate commits).

---

## 9. Verification

```bash
cd /Users/ibabo/Documents/repo/pakfactory.com
pnpm --filter @pakfactory/blog build && pnpm --filter @pakfactory/www build
pnpm dev:blog   # and/or dev the www app
```

Visual QA (light mode):

- [ ] Page background is warm cream `#f4f1eb`; cards stay white.
- [ ] Primary buttons ("Contact Us", "Sign Up", "Let's talk") are forest green.
- [ ] Focus rings are green.
- [ ] Dieline dashes are the long **6px/6px** pattern (not short browser default), consistent in Chrome + Safari.
- [ ] Borders/dividers read warm taupe, not cool gray.
- [ ] Corners are slightly rounder (14px).

Regression QA:

- [ ] **Toggle dark mode** — appearance is identical to before this change (dark was not touched).
- [ ] `apps/www` renders with the brand palette and nothing is broken by the shared change.
- [ ] `git diff` on `globals.css` shows **only** `:root` (light), the new families, shadows, radius, layout-max, and the appended dashed block — **no `.dark` or chart lines**.

---

## 10. Rollback

If anything regresses: `git revert <migration-sha>` (or `git checkout <baseline-sha> -- packages/ui/src/globals.css`), rebuild both apps. Because the change is one file and one commit, rollback is atomic and does not touch dark mode, charts, or any component.

---

## 11. Amendment — 2026-08-27: 2026 primary green `#285429` (www only)

The 2026 website design moves primary green to `#285429`. Source of truth: Figma node [5178:75186](https://www.figma.com/design/m2bfgzA4X8AED7OM9ia5sL/New-Website---2026-New-Version?node-id=5178-75186) (nav "Get a quote" CTA).

**`packages/ui` is deliberately unchanged** — it still ships the §3 green `#2b5f2d`. Editing the shared token would repaint `apps/blog`, which is live on the `staging` → `main` path while the www rebuild sits on `www-new-release`. So the new green is applied as a **www-only overlay** in `apps/www/src/app/globals.css`.

`#2b5f2d` → `#285429` (rgb 43,95,45 → 40,84,41): slightly darker and less saturated. White-on-green contrast improves from ~7.6:1 to ~8.8:1, clearing WCAG AAA for body text.

### Tokens overridden in www's `:root`

| Token | ui ships | www overrides to |
| --- | --- | --- |
| `--primary` | `#2b5f2d` | `#285429` |
| `--primary-foreground` | `#ffffff` | `#ffffff` (pinned, no-op today) |
| `--ring` | `#2b5f2d` | `#285429` |
| `--primary-hover` | `#245125` | `#214822` |
| `--button-primary-hover` | *(www-only token)* | `#214822` (was `#2e3e27`) |

`--primary-hover` is rescaled by preserving its per-channel ratio to the old primary, so the relationship set in §4 carries over to the new base.

**Not overridden**, because www has no consumers and dead overrides rot: `--primary-active`, `--opacity-primary-10`…`-60`, `--primary-gradient`, `--shadow-primary-*`, and the `--sidebar-*` family. Add one only when a www component starts using it. Dark mode is untouched — it inverts `--primary` to `rgb(229 229 229)`, so no green lives there.

### Default Button restyled

The unlayered www-only rule for `[data-slot="button"][data-variant="default"]` moved from **forest `#17280f` + lemongrass `#ade35c`** to `var(--primary)` + `var(--primary-foreground)`, keeping the `9999px` pill. This rule is what actually paints the CTA — it is unlayered on purpose and beats the ui primitive's `bg-primary` / `text-primary-foreground` utilities, so the earlier forest/lemongrass pairing, not `--primary`, was the button's real source of color.

`--brand-forest` and `--brand-lemongrass` remain defined. Forest is still used by `apps/www/src/components/product/customization-entry.tsx`; lemongrass now has no consumer but stays as a palette token.

Because the button rule and `--primary` both changed, every default button in www plus `bg-primary` (7 components), `text-primary` (13 files), `border-primary` (2), and all focus rings shift to the new green at once.

### Promotion path

When www launches and blog adopts the 2026 palette, move `--primary`, `--primary-foreground`, `--ring`, and `--primary-hover` into `packages/ui/src/globals.css` per ADR-006 and delete the www overrides. Overriding ui-defined tokens in app CSS is a conscious, temporary divergence from the `AGENTS.md` rule that app CSS only *adds* tokens ui lacks; it is bounded by that promotion step.

### Follow-up: duplicate declarations in ui

`packages/ui/src/globals.css` `:root` declares `--primary-hover`, `--primary-active`, and the whole `--opacity-primary-*` ramp **twice** — once inline in the §3 palette block, once in the §4 families block. Later declarations win, so the §4 copies are the effective values. The `--opacity-neutral-*` ramp is duplicated the same way. Any future retune of the shared token must edit both copies or it will half-apply. Worth its own `packages/ui` ticket on `staging`.

### Auth email templates

`apps/www/docs/auth-emails/confirm-signup.html` and `reset-password.html` hardcode the brand hex inline (email clients strip CSS variables). Both moved to `#285429`. They are **pasted into the Supabase dashboard by hand**, so the repo edit alone changes nothing in production — a human must re-paste both templates.

### Note for design

The Figma node hardcodes `#285429` as a raw hex rather than binding it to a variable, and exposes no green hover/active state, so the hover value above is derived in code. Promoting primary to a real Figma variable would make future retunes a single edit on the design side.
