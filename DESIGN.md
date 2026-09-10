# PakFactory — Design Language Reference

**Read this before designing, building, or planning any UI component.**

Structure inspired by Sparkbites-style design-language refs; **values are PakFactory’s, not Vercel’s.** Token values live in [`packages/ui/src/globals.css`](packages/ui/src/globals.css) — use **token names** here; read hex/sizes from CSS.

Also read: [`AGENTS.md`](AGENTS.md) § UI and design system · [ADR-006](docs/adr/0006-design-system-and-tokens.md) · app [`CLAUDE.md`](apps/blog/CLAUDE.md) / [`www/CLAUDE.md`](apps/www/CLAUDE.md) for gutters · [ADR-008](docs/adr/0008-component-archetype-grouping.md) / [ADR-013](docs/adr/0013-shared-core-vs-feature-composition.md) for placement.

---

## 1. Visual Theme & Atmosphere

PakFactory’s UI is **packaging-brand restraint**: clear hierarchy, a dieline content frame, and purposeful surfaces — not a generic SaaS dashboard and not a Shopify storefront.

- Canvas is light (`--background` white); text is near-black (`--foreground`).
- Interactive accent is **forest green** (`--primary`), not blue and not purple gradients.
- Warm **brand cream** (`--brand-cream`) appears for selected bands (e.g. newsletter); do not invent a second cream palette.
- Atmosphere should feel engineered and trustworthy for B2B packaging buyers: RFQ / “Get a quote” CTAs, not cart chrome.

Avoid AI-default looks that fight Pak tokens (purple-on-white, terracotta-on-cream newspaper layouts, glow stacks, emoji ornament).

---

## 2. Color Palette & Roles

Map roles to **CSS variables** in `@pakfactory/ui/globals.css`. Do not hardcode competing hex in components when a token exists.

| Role | Token | Usage |
| --- | --- | --- |
| Background (canvas) | `--background` | Page canvas |
| Text (primary) | `--foreground` | Headings, body |
| Elevated surface | `--card` / `--popover` | Cards, menus |
| Recessed / muted surface | `--secondary`, `--muted`, `--accent` | Subtle fills |
| Muted text | `--muted-foreground` | Secondary labels, captions |
| Interactive / CTA | `--primary`, `--primary-foreground` | Primary buttons, links that should feel branded |
| Primary hover / active | `--primary-hover`, `--primary-active` | Button states |
| Focus ring | `--ring` | Focus (aligned with primary) |
| Border / input | `--border`, `--input` | Dividers, field chrome |
| Brand cream band | `--brand-cream`, `--brand-cream-foreground` | Warm section surfaces |
| Soft highlight | `--brand-highlight` | Meta/CTA highlight surfaces |
| Destructive | `--destructive` | Errors / danger only |
| Primary tints | `--opacity-primary-10` … `--opacity-primary-60` | Soft fills, hover washes |
| Neutral scrims | `--opacity-neutral-*` | Overlays, faded chrome |
| Charts | `--chart-1` … `--chart-5` | Data viz only |

**Philosophy:** one brand accent (forest green). Status / chart colors stay small and data-bound — not large decorative fills.

---

## 3. Typography Rules

- **Geist Sans** (`--font-sans` / `--font-geist-sans`) for UI and marketing copy.
- **Geist Mono** (`--font-mono`) for code.
- Prefer existing Tailwind type scale and app patterns; **do not invent a parallel type system** or Vercel-style extreme tracking tables unless Figma for that surface specifies it.
- Emphasis via size, color (`foreground` vs `muted-foreground`), and spacing — not random `font-bold` everywhere.

---

## 4. Component Stylings

### Prefer shared primitives

From `@pakfactory/ui`: **`Button`**, **`Card`** (+ header/title/description/content/footer), **`Badge`**, **`Input`**, and other existing shadcn-style primitives. Avoid raw bordered `div`s when a primitive fits.

### CTAs (domain)

- Primary actions: quote / RFQ / “Talk to packaging experts” — `Button` with primary (forest) styling.
- Do **not** introduce cart, checkout, or “Add to cart” patterns unless product explicitly requests them.

### Cards

- Use cards for **interactive or content containers** (lists, pillars, forms), not decorative chrome around every section.
- If removing border/shadow/background/radius does not hurt understanding, it should not be a card.

### Focus & interaction

- Use existing focus/ring behavior from primitives (`--ring`).
- Prefer color and elevation changes already in the design system over novel hover animations.

### Radius

- Base radius: `--radius` (see CSS; Figma-aligned). Use `--radius-sm` … `--radius-xl` derived scales — do not invent one-off radii.

---

## 5. Layout Principles

### Content column (dieline)

| Token | Role |
| --- | --- |
| `--layout-max` | Content max width — **1280px** default; **1440px** at `min-width: 1600px` (live CSS is SoT) |

Use `max-w-[var(--layout-max)]` / blog `PageDielineSection` helpers. Do not invent a second page-width token.

### Spacing (8pt — binding)

From [`AGENTS.md`](AGENTS.md):

- Grid unit: `--spacing-grid-unit` (8px) → prefer `gap-2`/`p-2` (8), `gap-4` (16), `gap-6` (24) or `gap-grid-*` / `p-grid-*`.
- `gap-1` / `p-1` (4px) only for tight pairs (label ↔ description, icon ↔ label).
- **Do not** use fractional steps that yield 6/10/14px (`gap-1.5`, `gap-2.5`, `py-2.5`, `mt-1.5`, `space-y-1.5`).
- Form rhythm: label+description `gap-1` → control `gap-2` → between fields `gap-4`.

### Blog dieline gutters

Mobile **outer 16px** (`px-4`) + **inner 16px** (`px-4`) = **32px** viewport → content via [`page-dieline-section`](apps/blog/src/components/layout/page-dieline-section.tsx). Do not set mobile outer to `px-8`. Flush borders need `px-0 md:px-0`. Full-bleed bands: exactly one outer wrapper; newsletter cream may use `w-screen` shell (see blog CLAUDE).

### Composition

- One job per section: one headline, usually one short supporting line.
- Marketing first viewport: brand, one headline, one support line, one CTA group, one dominant visual — avoid stats strips and promo clutter in the hero.
- Prefer quote CTAs over e-commerce patterns.

---

## 6. Depth & Elevation

Use existing shadow tokens from `globals.css`:

| Family | Tokens |
| --- | --- |
| Neutral | `--shadow-2xs` … `--shadow-2xl` |
| Primary-tinted | `--shadow-primary-2xs` … `--shadow-primary-2xl` |

Primitives may use CSS `border` via shadcn patterns — **do not** mandate Vercel “shadow-as-border only.” Prefer tokens over raw `rgba` shadows in app code.

### Motion

| Token | Typical use |
| --- | --- |
| `--motion-fast` (200ms) | Chips / small controls |
| `--motion-base` (300ms) | Hovers |
| `--motion-slow` (500ms) | Text entrances |
| `--motion-reveal` (700ms) | Section reveals / hero |

Detail: [`docs/plans/PROD-1947-motion-animation-spec.md`](docs/plans/PROD-1947-motion-animation-spec.md). Prefer intentional, sparse motion — not decorative noise.

---

## 7. Do's and Don'ts

### Do

1. Read this file + `globals.css` before inventing UI.
2. Use `@pakfactory/ui` primitives and Pak token **names**.
3. Keep 8pt spacing; use dieline helpers on blog listings/bands.
4. Place components per ADR-008/011/013 (blocks / layout / views / modules / ui).
5. Extract shared UI as props-only `ui/` primitives; wire data/URLs in `modules/` (ADR-013).
6. Prefer RFQ / quote CTAs.

### Don't

1. Don’t copy Vercel blue (`#0072F5`), 4px spacing as the primary grid, or 45 custom breakpoints.
2. Don’t edit existing files under `packages/ui/src/components` except a confirmed bug you were asked to fix.
3. Don’t drive-by edit `packages/ui/src/globals.css` for a feature; evolving tokens is an ADR/design-system change.
4. Don’t invent new color tokens in app `globals.css` when ui already has one; if a second app needs the same token, move it to `@pakfactory/ui`.
5. Don’t build cart/checkout/PDP storefront patterns.
6. Don’t use fractional Tailwind spacing that breaks 8pt.
7. Don’t fork a feature component into another feature — extract the shared core.

---

## 8. Responsive Behavior

- Use **Tailwind default breakpoints** and existing layout helpers.
- Do **not** add dozens of one-off media queries per component (reject Vercel’s 45-breakpoint model).
- Wide screens: `--layout-max` expands at 1600px+ per CSS — consume the token, don’t hardcode 1440 in components.

---

## 9. Agent Prompt Guide

### Quick reference (names, not a second SoT)

```
Canvas:            --background / --foreground
Primary CTA:       --primary (#2b5f2d in CSS) + --primary-foreground
Muted:             --muted / --muted-foreground
Cream band:        --brand-cream
Border:            --border
Radius:            --radius (+ sm/md/lg/xl)
Layout max:        --layout-max (1280 / 1440@1600+)
Spacing:           8pt grid (--spacing-grid-unit)
Shadows:           --shadow-* / --shadow-primary-*
Motion:            --motion-fast|base|slow|reveal
Font:              Geist (--font-sans / --font-mono)
Primitives:        Button, Card, Badge, Input from @pakfactory/ui
CTA language:      Get a quote / Talk to packaging experts
```

### Example prompts

**1. Metrics / content card**  
> Build a card with `@pakfactory/ui` `Card`. Use token surfaces (`bg-card`, `border-border`). Title `text-foreground`, meta `text-muted-foreground`. Padding on 8pt (`p-4`/`p-6`). No raw hex.

**2. Primary RFQ button**  
> Add a primary `Button` labeled “Get a quote”. Use primary/forest styling from the design system. Do not add cart icons or checkout copy.

**3. Dieline section**  
> Wrap the section in the blog dieline helpers (`PageDielineSection` / documented gutters). Content max width `var(--layout-max)`. Mobile outer+inner 16px; no `px-8` outer on mobile.

**4. Form field group**  
> Label + description in `gap-1`; group to control `gap-2`; between fields `gap-4`. Use `Input` from `@pakfactory/ui`. Focus via existing ring tokens.

**5. Cream CTA band**  
> Full-bleed cream band using `--brand-cream` (or established newsletter pattern). One headline, one short line, one primary CTA. Keep motion to `--motion-base` or reveal tokens only if the surface already animates.

---

## Placement reminder

| Need | Put it in |
| --- | --- |
| Sanity page-builder block | `src/components/blocks/` + Studio schema |
| Site chrome | `src/components/layout/` |
| Multi-route page template | `src/components/views/` |
| Data/URL wiring | `src/components/modules/` |
| Props-only shared UI | app `ui/` or `@pakfactory/ui` |
| Single-route whole page | Inline in `page.tsx` (ADR-007) |

Map of all agent docs: [`docs/ai-agent-docs.md`](docs/ai-agent-docs.md).
