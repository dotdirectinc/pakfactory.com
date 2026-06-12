# PakFactory Sanity Studio — Content Team Field Checklist

A complete list of every document type and field the content team will see in Sanity Studio. Use this as a planning reference for what editors need to fill out when publishing a post, managing authors, organizing categories, etc.

This is a content-side checklist, not a developer spec. It answers: _"What does the writer need to click on and fill in?"_

## Document Types Overview

| Document Type      | Purpose                                        | Created By              |
| ------------------ | ---------------------------------------------- | ----------------------- |
| Post               | The blog articles themselves                   | Content writers         |
| Author             | Writer profiles (Crystal Chan, etc.)           | Admin / once per writer |
| Category           | Top-level groupings (your 5 categories)        | Admin (rarely changes)  |
| Tag                | More granular topic labels (many per post)     | Content writers         |
| Blog Site Settings | Global site config (one record, edited rarely) | Admin                   |
| Redirect           | URL redirect entries (mostly auto-created)     | Auto / admin            |

---

## 1. Post Document

This is where 95% of content team time will be spent. Fields should be grouped into tabs/sections in Studio for clarity.

### Tab 1: Content

The essentials of the post itself.

- [ ] **Post title** — the H1 headline shown on the page. Written for readers. No strict character limit but ideally under ~80 chars for readability.
- [ ] **Slug** — the URL path. Auto-generated from title but editable. Must be unique. Lowercase, hyphens only.
- [ ] **Excerpt / summary** — 1-2 sentence summary shown on listing pages and used as fallback meta description.
- [ ] **Featured image** — the main hero image. Required field. Should include alt text.
- [ ] **Body** — the rich text content. Sanity calls this "Portable Text." Supports:
    - Headings (H2, H3, H4 — H1 is reserved for post title)
    - Bold, italic, underline, strike
    - Lists (bulleted and numbered)
    - Inline images (with their own alt text)
    - Links (open in new tab, add "nofollow" to link, add "sponsored" to link, add "ugc" to link). [Example](https://www.wpbeginner.com/wp-content/uploads/2020/11/nofollow-option-all-in-one-seo.png)
    - Block quotes
    - Code blocks (rarely needed for packaging content, but available)

### Tab 2: Categorization

How the post is organized and discovered.

- [ ] **Category** — single-select from the categories (Packaging News, Trends, Business Strategy, Sustainability, Design Inspiration). Required.
- [ ] **Tags** — multi-select. Free-form taxonomy. Writers can add new tags on the fly, but with a dropdown of existing tags to encourage reuse.
- [ ] **Related posts** — optional reference array (up to 3-5 manually selected). Falls back to category-based suggestions if empty.
- [ ] **Featured post toggle** — boolean. When true, post appears in "Featured" section on blog home or category pages. Limit to a reasonable number active at a time.

### Tab 3: Publishing

Attribution and timing.

- [ ] **Author** — reference to an Author document. Required.
- [ ] **Publish date** — when the post should go live. Editable. Auto-set to "now" on first publish but can be back-dated for migrated content or scheduled forward for embargoes.
- [ ] **Last modified date** — auto-updated when post is edited. Editor can override (useful when fixing typos that shouldn't bump the date for SEO purposes).

### Tab 4: SEO

The editor-controlled SEO overrides. All fields are optional with smart defaults.

- [ ] **Meta title** — the title that appears in Google search results and browser tabs. Character counter with warning at 60. Falls back to post title if empty.
- [ ] **Meta description** — the snippet under the SERP listing. Character counter with warning at 160. Falls back to excerpt if empty.
- [ ] **Canonical URL** — used only when this post is syndicated from or to another site. Leave blank in 99% of cases.
- [ ] **Index toggle** — `Allow search engines to index this post` (default ON). Turn off for thin or duplicate content.
- [ ] **Follow toggle** — `Allow search engines to follow links in this post` (default ON). Rarely changed.
- [ ] **No image index toggle** — separate toggle to prevent images from appearing in Google Images. Default OFF.
- [ ] **AI training toggle** — `Allow LLMs to use this post for training` (default ON). Useful for content PakFactory wants associated with the brand in AI knowledge.
- [ ] **AI answering toggle** — `Allow LLMs to cite this post in answers` (default ON). Separate from training — you might want one but not the other.

### Tab 5: Social Sharing

How the post looks when shared on social platforms.

- [ ] **Social image (OG image)** _(optional)_ — custom image for social shares. Falls back to featured image. Recommended 1200×630px.
- [ ] **Social title (OG title)** _(optional)_ — punchier headline for social. Falls back to meta title, then post title.
- [ ] **Social description (OG description)** _(optional)_ — falls back to meta description.

### Tab 6: Schema & AI Optimization

Fields that power structured data and answer-engine optimization.

- [ ] **TL;DR / Key takeaways** _(optional but recommended)_ — short summary of the post's key points. Rich text. Renders at the top of the post AND injected into JSON-LD schema for AI engines.
- [ ] **FAQ section** _(optional)_ — first-class array of question/answer pairs. Each pair has a question (string) and answer (rich text). Renders as a visible FAQ section AND emits FAQPage schema.
- [ ] **HowTo steps** _(optional)_ — only used for tutorial posts. Fields for step name, instructions, image per step, plus total time and required supplies/tools.
- [ ] **Citations / sources** _(optional)_ — array of references used in the post. Each entry: label, URL, optional publication name and author. Renders as visible footnotes AND emits citation schema.
- [ ] **Speakable selectors** _(optional, advanced)_ — mark specific paragraphs as "speakable" for voice assistant readouts. Most posts won't need this; [Example](https://developers.google.com/search/docs/appearance/structured-data/speakable).

---

## 2. Author Document

Set up once per writer. Becomes the source of truth for that person across all their posts. Each author also gets a dedicated profile page (`/blog/author/[slug]`) that needs its own SEO treatment.

- [ ] **Name** — full name as it appears in bylines. Required.
- [ ] **Slug** — for the author's profile page URL (e.g. `/blog/author/crystal-chan`). Required.
- [ ] **Job title** — e.g. "Senior Content Writer". Used in schema and on profile page.
- [ ] **Photo** — headshot. Used on profile page and optionally in post bylines.
- [ ] **Short bio** — 1-3 sentence intro shown on posts.
- [ ] **Long bio** — fuller bio shown on the author's profile page.
- [ ] **Credentials** _(optional)_ — degrees, certifications, awards. Boosts E-E-A-T signals for AI search.
- [ ] **Social profiles** — array of social URLs (LinkedIn, X, Instagram, personal site, etc.). Used in Person schema's `sameAs` array.
      [Example](https://developers.google.com/search/docs/appearance/structured-data/article#use-the-appropriate-type)

### SEO fields (for the author profile page)

All optional with smart fallbacks. Default template: `[Name], [Job Title] | PakFactory Blog`.

- [ ] **Meta title** _(optional)_ — falls back to auto-generated template
- [ ] **Meta description** _(optional)_ — falls back to short bio
- [ ] **OG image** _(optional)_ — falls back to author photo, then global default
- [ ] **Index toggle** — default ON (auto-OFF if Active toggle is OFF)
- [ ] **Follow toggle** — default ON
- [ ] **No image index toggle** — default OFF

---

## 3. Category Document

Set up once per category. Editors will mostly leave these alone after setup. Each category gets a landing page (`/blog/[category-slug]`) — these are high-value SEO hub pages and deserve full SEO control.

- [ ] **Name** — e.g. "Sustainability". Required.
- [ ] **Slug** — for the category page URL. Required.
- [ ] **Description** — 1-3 sentences describing what this category covers. Used on the category landing page and as meta description.
- [ ] **Featured image / banner** — used as hero on the category page and as default OG image for posts in this category (unless overridden).
- [ ] **Index toggle** — `Show this category in search results` (default ON). Useful to flip off for sparse categories.

### SEO fields (for the category landing page)

All optional with smart fallbacks. Default template: `[Name] — Custom Packaging Insights | PakFactory Blog`. Categories are SEO-critical hub pages — encourage editors to write custom meta titles and descriptions for them.

- [ ] **Meta title** _(optional but recommended)_ — falls back to auto-generated template
- [ ] **Meta description** _(optional but recommended)_ — falls back to category description
- [ ] **OG image** _(optional)_ — falls back to Featured image / banner
- [ ] **OG title** _(optional)_ — falls back to meta title
- [ ] **OG description** _(optional)_ — falls back to meta description
- [ ] **Index toggle** — default ON; flip OFF only if a category is being phased out
- [ ] **Follow toggle** — default ON
- [ ] **No image index toggle** — default OFF
- [ ] **Canonical URL** _(optional, rare)_ — for cases where category content is syndicated elsewhere

---

## 4. Tag Document

Tags are lighter than categories. Editors create them on the fly when writing posts. Each tag generates an archive page (`/blog/tag/[slug]`), but these are often SEO-thin and should be `noindex` by default to prevent thin-content penalties.

### Identity fields

- [ ] **Name** — e.g. "Recyclable materials". Required.
- [ ] **Slug** — auto-generated. Required.
- [ ] **Description** _(optional)_ — short blurb shown on the tag's archive page. Helps avoid the "thin content" issue.

### SEO fields (for the tag archive page)

Default template: `Posts about [Tag name] | PakFactory Blog`. Tags default to `noindex` to prevent low-value archive pages from getting indexed — flip ON only for tags with sufficient content depth (≥5-10 posts) and clear SEO value.

- [ ] **Meta title** _(optional)_ — falls back to auto-generated template
- [ ] **Meta description** _(optional)_ — falls back to tag description, then auto-generated
- [ ] **Index toggle** — default **OFF** (intentional — see auto-indexing rules below)
- [ ] **Follow toggle** — default ON (post links from the tag page still pass authority)
- [ ] **No image index toggle** — default OFF

### Auto-noindex safety net

Site Settings should include: `Auto-noindex tag pages with fewer than X posts` (recommended default: 3). This prevents accidentally-indexed thin tag pages even if an editor enables indexing manually.

Tags don't need much beyond this. The point is to be quick to create and easy to reuse.

---

## 5. Site Settings (Singleton)

A single document containing global settings. Only admins should edit. The content team should be able to view but not modify in most cases.

Many of these are developer-set-once-and-forget, but listing them so the team knows what's there:

### Identity

- [ ] Site name, tagline, default meta title template, default meta description
- [ ] PakFactory Organization details (legal name, logo, founding date, contact info)
- [ ] Social profile URLs (LinkedIn, Instagram, Facebook, etc.)

### Default SEO

- [ ] Default Open Graph image (used when a post has none)
- [ ] Default Twitter card type
- [ ] Default robots directive

### Integrations

- [ ] GTM container ID
- [ ] Search Console / Bing verification tokens
- [ ] IndexNow API key

### Crawler Controls

- [ ] Editable `robots.txt` content
- [ ] Editable `llms.txt` content
- [ ] **Auto-noindex threshold for tag pages** — number of posts below which tag pages are automatically `noindex` (recommended: 3)

### SEO Title Templates

- [ ] Default post title template (e.g. `%title% | PakFactory Blog`)
- [ ] Default category title template (e.g. `%name% — Custom Packaging Insights | PakFactory Blog`)
- [ ] Default author title template (e.g. `%name%, %job_title% | PakFactory Blog`)
- [ ] Default tag title template (e.g. `Posts about %name% | PakFactory Blog`)

### AI Controls

- [ ] Global "Allow AI training" default
- [ ] Global "Allow AI answering" default

---

## 6. Redirects (Mostly Auto-Managed)

The content team interacts with this rarely. Auto-creation handles 90% of cases. If a post's slug is being changed, a redirect from the old slug is auto-created (no editor action needed).

- [ ] From URL
- [ ] To URL
- [ ] Type (301 / 302)
- [ ] Notes
- [ ] Active toggle

---

## Custom Widgets for the Post Body

These are reusable blocks editors can insert into the post body, beyond plain text. **Custom blocks are preferred over inline HTML, rich-text tables, or pasted embed codes** — they ensure consistent styling, accessibility, and crawlability by search engines and AI engines.

**Tier 1 — Build for launch (high priority for AEO/GEO):**

- [ ] **Comparison Table** — for "Material A vs Material B" type content. Renders as semantic HTML `<table>`, fully crawlable by Google and AI engines. Very common in packaging content.
- [ ] **Stat Callout** — emphasized data points like "73% of consumers prefer eco-friendly packaging." Renders as semantic HTML with required source citation. **High AEO value — LLMs love clear stat-with-source patterns.**
- [ ] **Data Visualization (chart)** — for bar/line/pie charts. Renders BOTH a visual chart AND a semantic HTML `<table>` of the underlying data. The table is always present in HTML so AI engines can read the data. See `pakfactory-data-visualization-spec.md` for details.
- [ ] **Callout/info box** — for "Pro tip," "Fun fact," "Did you know?" style highlights. Choose icon/color.
- [ ] **Pull quote** — large stylized quote with optional attribution. Renders as semantic `<blockquote>`.
- [ ] **Embed block for media** — paste a YouTube, Vimeo, X post, or Instagram post URL and it renders embedded.
- [ ] **Product reference** — link to a PakFactory product page with auto-fetched preview (product name, image, price range, CTA button). Very valuable for converting blog readers.
- [ ] **CTA box** — "Get a quote," "Download our guide," etc. Standardized so they're consistent across posts.
- [ ] **Internal link card** — visual card linking to a related blog post with preview image.

**Tier 2 — Add later if specific need arises:**

- [ ] **Image gallery / carousel** — multiple images grouped together.
- [ ] **Datawrapper / Flourish embed** — only for cases where visual polish outweighs AEO crawlability concerns. Should be the exception, not the default.
- [ ] **Sortable data table** — for longer datasets with search/filter. Overkill for most blog posts.

#### What to AVOID

These approaches look easy but cause long-term problems:

- ❌ **Pasting HTML/iframe embed codes into the body for data viz.** Content in iframes is attributed to the embedding service's domain, not yours. AI engines typically don't follow iframes. Use custom blocks instead.
- ❌ **Uploading charts as images only.** Data locked in pixels is invisible to AI engines and screen readers. If you must use an image chart, repeat the key data points in surrounding prose.
- ❌ **Rich-text tables (typing tables in the body editor).** Limited styling, awkward mobile behavior, often produce malformed HTML. Use the Comparison Table block.
- ❌ **Charts rendered to `<canvas>` only.** Canvas is a pixel buffer — invisible to crawlers. Use SVG, or pair canvas with an HTML table fallback.

---

## Image Asset (Library)

When editors upload an image type, Sanity should require these fields _on the asset itself_ (not per use):

- [ ] **Alt text** — required. Description for screen readers and SEO.
- [ ] **Caption** — optional, displayed under the image if set.
- [ ] **Filename** — should be descriptive on upload (editors should be coached on this, but enforcement is hard).

---

## Suggested Studio UX Structure

Sanity Studio lets you organize fields into groups (tabs at the top of a document) and fieldsets (collapsed sections). The general rule:

- **Group by editor mental model** ("what I write" vs "how it appears in search"), not by data type
- Default tab opens to the **most common task**

### Post Document (6 tabs)

The most complex document. Tabs are essential.

```
Post Document
├─ 📝 Content  (title, slug, excerpt, featured image, body)        ← default tab
├─ 🏷️ Categorization  (category, tags, related posts, featured toggle)
├─ 👤 Publishing  (author, dates)
├─ 🔍 SEO  (meta title, meta description, indexing toggles, canonical)
├─ 📣 Social  (OG image, OG title, OG description)
└─ 🤖 Schema & AI  (TL;DR, FAQ, HowTo, citations, AI toggles)
```

### Author Document (2 tabs)

```
Author Document
├─ 👤 Profile  (name, slug, job title, photo, bios, expertise, credentials, social profiles, active toggle)   ← default tab
└─ 🔍 SEO  (meta title, meta description, OG image, indexing toggles)
```

### Category Document (2 tabs)

Identity stays together, SEO gets its own tab. Encourage editors to write custom meta for category pages since they're SEO-critical hub pages.

```
Category Document
├─ 📁 Identity  (name, slug, description, featured image, icon, display order, color)   ← default tab
└─ 🔍 SEO  (meta title, meta description, OG image/title/description, indexing toggles, canonical URL)
```

### Tag Document (2 tabs)

Tags should be quick to create. Tabs would slow down the workflow.

```
Tag Document
├─ 📁 Identity  (name, slug, description, ...)   ← default tab
└─ 🔍 SEO  (meta title, meta description, ...)
```

### Blog Site Settings Singleton (6 tabs)

The most complex non-Post document. Clear separation of concerns helps admins find what they're looking for.

```
Site Settings
├─ 🏢 Identity  (site name, tagline, Organization details, default meta description)   ← default tab
├─ 📣 Social  (default OG image, default Twitter card, Organization sameAs links)
├─ 🔍 SEO Defaults  (default robots directive, default publisher, SEO title templates per doc type)
├─ 🤖 AI & Crawlers  (robots.txt, llms.txt, GPTBot/ClaudeBot rules, AI training/answering defaults, ...)
└─ 🔌 Integrations  (GTM container ID, Search Console verification, Bing verification, IndexNow API key)
```

---

## Reference Docs

- `pakfactory-seo-checklist.md` — full SEO/AEO/GEO implementation
- `pakfactory-redirect-management-spec.md` — redirect system
- `pakfactory-structured-data-spec.md` — JSON-LD implementation
- `pakfactory-data-visualization-spec.md` — data viz blocks (tables, charts, stat callouts)
