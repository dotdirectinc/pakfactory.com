# PakFactory — Design Language Reference

**Read this before designing, building, or planning any UI component.**

Structure inspired by Sparkbites-style design-language refs; **values are PakFactory’s, not Vercel’s.** Token values live in [`packages/ui/src/globals.css`](packages/ui/src/globals.css) — use **token names** here; read hex/sizes from CSS.

Also read: [`AGENTS.md`](AGENTS.md) § UI and design system · [`ENGINEERING.md`](ENGINEERING.md) for RSC/scaffold · [ADR-006](docs/adr/0006-design-system-and-tokens.md) · app [`CLAUDE.md`](apps/blog/CLAUDE.md) / [`www/CLAUDE.md`](apps/www/CLAUDE.md) for gutters · [ADR-008](docs/adr/0008-component-archetype-grouping.md) / [ADR-013](docs/adr/0013-shared-core-vs-feature-composition.md) for placement.

---

## 1. Visual Theme & Atmosphere

PakFactory’s UI is **packaging-brand restraint**: clear hierarchy, a dieline content frame, and purposeful surfaces — not a generic SaaS dashboard and not a Shopify storefront.

- Canvas is light (`--background` white); text is near-black (`--foreground`).
- Interactive accent is **forest green** (`--primary`), not blue and not purple gradients.
- Warm **brand cream** (`--brand-cream`) appears for selected bands (e.g. newsletter); do not invent a second cream palette.
- Atmosphere should feel engineered and trustworthy for B2B packaging buyers: RFQ / “Get a quote” CTAs, not cart chrome.
- **Spacing:** an **8pt grid** with a preference for **breathing room** — see [Spacing (8pt — binding)](#spacing-8pt--binding). Not a 4pt-as-default system.

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
| Catalog swatches | `--swatch-*` / `bg-swatch-*` | Configurator Color fallbacks when a property value has no image (values in `globals.css` only) |
| Destructive | `--destructive` | Errors / danger only |
| Primary tints | `--opacity-primary-10` … `--opacity-primary-60` | Soft fills, hover washes |
| Neutral scrims | `--opacity-neutral-*` | Overlays, faded chrome |
| Charts | `--chart-1` … `--chart-5` | Data viz only |

**Philosophy:** one brand accent (forest green). Status / chart colors stay small and data-bound — not large decorative fills.

**Inactive / disabled:** interactive text and chrome labels that are inactive, non-selected, or disabled use `text-muted-foreground` — never near-black `text-foreground`. Active / selected primary labels use `text-foreground`.

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

### Links

- **Text links** (inline anchors or `Button variant="link"`) always use `underline underline-offset-4` at rest. Prefer the shared `link` button variant or the same classes on a Next.js `Link`.
- **Arrow / chevron CTAs** (text links like “See all”) use the chevron as the affordance — underline is not required.
- **Circular directional controls** (carousel prev/next, accordion expand): shadcn **`Button` `size="icon-lg"`** (40px / `size-10`) with Lucide **`Chevron*`** (not `Arrow*`). Fill: `bg-foreground` + light icon. In www, wrap the glyph with [`Icon`](apps/www/src/components/ui/icon.tsx) `size="sm"`.
- **Filled / outline / ghost buttons** do not use underline for affordance. Nav and logo chrome may keep `no-underline`.

### CTAs (domain)

- Primary actions: quote / RFQ / “Talk to packaging experts” — `Button` with primary (forest) styling.
- Do **not** introduce cart, checkout, or “Add to cart” patterns unless product explicitly requests them.

### Cards

- Use cards for **interactive or content containers** (lists, pillars, forms), not decorative chrome around every section.
- If removing border/shadow/background/radius does not hurt understanding, it should not be a card.
- `@pakfactory/ui` **`Card`** remains the form / metrics / content surface primitive (header, title, description, footer).

**www catalog tiles** use two named types — prefer these names in design and engineering talk:

| Type | Job | Shared core | Includes | Excludes |
| --- | --- | --- | --- | --- |
| **General card** | Discovery / navigation | `MediaTileCard` (via `CatalogCard`) | Centered title, optional description, text CTA (“See all”), whole-card settle scale, brand mark on media hover | Bookmark / compare utilities, SKU eyebrow, left-aligned product meta |
| **Transactional card** | Catalog item with utilities | `MediaCardFrame` | Media settle-zoom, brand mark, bookmark / compare overlays, eyebrow (SKU or category), left-aligned title | Centered blurb + “See all” CTA |

- Feature tiles compose the cores: **ProductCard** / **CustomizationCard** → transactional; product lines / styles / formats → general (`CatalogCard`).
- Settle scale is shared (`PRODUCT_MEDIA_SCALE` 0.98 → 1.0): general cards settle the **whole tile**; transactional cards settle **media only**. Do not invent a second scale or grow past 1.

### Focus & interaction

- Use existing focus/ring behavior from primitives (`--ring`).
- Prefer color and elevation changes already in the design system over novel hover animations.
- **Cursor:** interactive links (`a[href]`) and buttons use `cursor-pointer`. Disabled / non-interactive controls do not (`not-allowed` / `pointer-events-none`).

### Radius

- Box / card radius: `--radius` (14px, Figma rounded-box). `Card` uses `rounded-xl`.
- Buttons: `--radius-control` (**6px**) — between Tailwind `xs` (2px) and our `sm` (~10px). Do not invent one-off radii on call sites.
- Use `--radius-sm` … `--radius-xl` for elevated surfaces. Keep `rounded-full` for true circles only (avatars, radios, switches, badges). Never force pills on Buttons.

---

## 5. Layout Principles

### Content column (dieline)

| Token | Role |
| --- | --- |
| `--layout-max` | Content max width — **1280px** default; **1440px** at `min-width: 1600px` (live CSS is SoT) |

Use `max-w-[var(--layout-max)]` / blog `PageDielineSection` helpers. Do not invent a second page-width token.

### Spacing (8pt — binding)

**Principle:** layout and component spacing snap to an **8-point grid** so rhythm stays consistent and surfaces keep **breathing room**. Challenged against a full 4pt grid — **8pt is primary**; 4px is exception-only, not a competing system.

| Step | px | Typical Tailwind | Use |
| --- | --- | --- | --- |
| Tight pair only | 4 | `gap-1` / `p-1` | Label ↔ description, icon ↔ label |
| Base unit | 8 | `gap-2` / `p-2` | Compact related controls |
| Comfortable | 16 | `gap-4` / `p-4` | Card internals, field groups |
| Airy | 24 | `gap-6` / `p-6` | Section stacks, roomy card padding |
| Section / inset | 32 | `gap-8` / `p-8` / `px-8` | Band gaps, card meta inset |

Token: `--spacing-grid-unit` (8px) in `@pakfactory/ui/globals.css`. Prefer `gap-grid-*` / `p-grid-*` when those utilities fit.

- **Prefer the roomier even step** when a surface feels cramped at `lg+` (e.g. choose `px-8` / `gap-6` over `px-4` / `gap-4`).
- **Card meta:** left- and center-aligned catalog tiles share the same airy inset (`px-8` / `pb-8` / internal `gap-4`) unless a density variant is explicitly documented.
- **Do not** use off-grid / fractional steps that yield 6/10/12/14/20px (`gap-1.5`, `gap-2.5`, `gap-3`, `gap-5`, `top-3`, `py-2.5`, `mt-1.5`, `space-y-1.5`).
- Form rhythm: label+description `gap-1` → control `gap-2` → between fields `gap-4`.

### Blog dieline gutters

Tokens in `@pakfactory/ui/globals.css`: `--layout-gutter-outer` / `--layout-gutter-inner` (utilities `px-layout-gutter-*`). Mobile **outer 16 + inner 16** = **32px** viewport → content; `sm+` inner **32px**; `md+` outer **32px** (matches `gap-8`). Prefer [`page-dieline-section`](packages/ui/src/components/page-dieline-section.tsx) helpers (blog keeps a synced fork). Do not set mobile outer to `px-8`. Flush borders: `px-0`. Full-bleed bands: exactly one outer wrapper; newsletter cream may use `w-screen` shell (see blog CLAUDE).

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

**Settle zoom (catalog / media tiles):** rest `PRODUCT_MEDIA_SCALE` (`0.98`) → hover `scale-100` over `--motion-base` (`duration-300 ease-out`), with `motion-reduce` keeping rest scale. Digit + classes: [`apps/www/src/lib/ui/product-media-scale.ts`](apps/www/src/lib/ui/product-media-scale.ts). Hover wrapper: www `MediaSettleZoom`; static thumbs use `productMediaLayerClass` only. Apply to **all product tiles** (catalog, PDP, request/account, customization options, legacy modules); do not invent competing scales (`1.02` / `1.05`). Parent must be `group` + `relative overflow-hidden` for hover settle.

**Collapsible / accordion:** open/close height slide via `animate-collapsible-down` / `animate-collapsible-up` in [`packages/ui/src/globals.css`](packages/ui/src/globals.css) (`--motion-base`, 0.3s ease-out). Chevron rotates `180deg` with `duration-300 ease-out`; skip transform transition under `motion-reduce`. Apply classes on `CollapsibleContent` at the call site (`overflow-hidden` + data-state animations); do not invent bespoke height transitions.

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
Radius:            --radius 14px cards; --radius-control 6px buttons; Card rounded-xl
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
> Wrap the section in the blog dieline helpers (`PageDielineSection` / documented gutters). Content max width `var(--layout-max)`. Mobile outer+inner 16+16; sm+ inner 32; md+ outer 32 (matches `gap-8`); no `px-8` outer on mobile. Prefer `px-layout-gutter-*`.

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
