# Contact page

How `/contact` and `/contact/[slug]` are wired. Studio owns the directory copy via a **Contact directory** section; Global Settings owns company contact facts. Agents write the seed script only — they never run it (AGENTS.md).

## Surfaces

| Surface | Path | Notes |
| --- | --- | --- |
| Hub | `/contact` → [`src/app/(site)/contact/page.tsx`](../src/app/(site)/contact/page.tsx) | `ContentPageView` — hub is a `contactDirectory` section; other bands follow in `sections[]` |
| Enquiry | `/contact/[slug]` → [`src/app/(request)/contact/[slug]/page.tsx`](../src/app/(request)/contact/[slug]/page.tsx) | Single form (`RequestShell`); Studio screens as group headings on one page; topic dropdown switches enquiry slug; signed-in email/name prefill; `noindex`; confirm-only submit |
| Document | pinned `contentPage` id **`contactPage`** | Desk: Content Pages → Contact Page → **Sections** |
| Company facts | Global Settings → Organization → Contact info | Email, phone, hours, structured address — never on the Contact document |

## Studio section: Contact directory

Allowed on Content Pages only (`SECTION_ALLOW.content`). Insert under **Layout → Contact directory**.

Fields (open the **Contact directory** section → Heading · Content · **Layout** — not a page-level Theme tab):

- **Heading / Intro** — page H1 and lead; blank uses site fallbacks (“Contact us”, …)
- **Layout** — vertical padding (default none) + top/bottom dieline borders. No band theme (dual-rail chrome is fixed).
- **Show live support rail** — left column from Global Settings (default on)
- **Ways to reach us** — one generic row each time. Always: title, line, button label, action.
  - **Link** — internal document, site path, or external URL (shared link fields). A quote is a Link to `/request/general` (or `/request`).
  - **Chat** — opens the site chat. No extra fields.
  - **Enquiry** — slug (`/contact/<slug>`), send-to (Support / Marketing / Sales, stored only), screens with fields, send label, success title and message.

The unused `contactForm` section type is unrelated (form picker stub) — do not confuse it with this directory.

## Seed (human-run)

Starter `contactDirectory` for `contactPage` lives in [`apps/studio/scripts/seed-contact-page.mjs`](../../../apps/studio/scripts/seed-contact-page.mjs). It upserts the directory section (stable `_key`), keeps other sections, and unsets legacy Content-tab fields (`headline`, `intro`, `channels`). Title, SEO, and Global Settings are untouched.

Dry run:

```bash
pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset development
```

Write:

```bash
pnpm --filter @pakfactory/studio run seed:contact-page -- --dataset development --confirm
```

## Starting rows

| Title | Line | Button | Action |
| --- | --- | --- | --- |
| Request a quote | Custom packaging, packaging services, or both. A packaging specialist gets back to you within 1–2 business days. | Start your quote | **Link** → site path `/request/general` |
| Ask a question | Not sure what you need? Our packaging experts can help. | Ask a question | **Enquiry** → slug `ask-a-question`, send to Support |
| Existing order / support | Something about an order you placed. | Get order help | **Enquiry** → slug `order-help`, send to Support |
| Partnerships | Resellers, agencies and brand collaborations. | Get in touch | **Enquiry** → slug `partnerships`, send to Sales |
| Press & media | Stories, interviews and media requests. | Contact our team | **Enquiry** → slug `press`, send to Marketing |
| Chat now | Talk to us live. | Start chat | **Chat** |

Enquiry screens in Studio become **light group headings** on one page (no steps, no cards). Topic Select lists all Enquiry rows so the buyer can change type without returning to `/contact`. Field labels use DESIGN.md Form fields (`text-xs`).

- **Ask a question:** Your question · Contact information (first/last/email, optional phone).
- **Order help:** Order or quote number · Topic · Details · Contact information (sole-field headings match field labels so no duplicate H2).
- **Partnerships:** Partnership type · About the partnership · Contact information (company required; website optional).
- **Press:** Your request (muted description; publication, topic, message, optional deadline) · Contact information.

## Code map

| Layer | Location |
| --- | --- |
| Schema | [`apps/studio/schemas/sections/contact-directory.ts`](../../../apps/studio/schemas/sections/contact-directory.ts), [`contactChannel.ts`](../../../apps/studio/schemas/contactChannel.ts) |
| GROQ | [`packages/sanity/src/queries/sections.ts`](../../../packages/sanity/src/queries/sections.ts) (`contactDirectory` branch), [`contact-channels.ts`](../../../packages/sanity/src/queries/contact-channels.ts) |
| Hub UI | [`src/components/contact/`](../src/components/contact/), [`contact-directory-section.tsx`](../src/components/sections/contact-directory-section.tsx) |
| Enquiry UI | [`contact-enquiry-flow.tsx`](../src/components/contact/contact-enquiry-flow.tsx) — single form + topic switcher; reuses `RequestShell` |
| Enquiry submit | [`src/lib/contact/submit-enquiry.ts`](../src/lib/contact/submit-enquiry.ts) — confirm only; Desk / CRM is a later ticket |
| Seed | [`apps/studio/scripts/seed-contact-page.mjs`](../../../apps/studio/scripts/seed-contact-page.mjs) — human-run only |

## Not in this build

- Zoho Desk / CRM delivery
- Rendering the unused `contactForm` section type
- Agents running the seed or patching `contactPage` via MCP
