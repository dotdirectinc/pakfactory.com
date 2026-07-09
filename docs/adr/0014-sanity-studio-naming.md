# ADR-0014 — Sanity naming: singular types, singular Studio labels

- **Status:** Accepted
- **Date:** 2026-07-08
- **Origin:** [PROD-1965](https://dotdirect.atlassian.net/browse/PROD-1965) (bug: "Change Sanity Document Type to Singular")
- **Reference:** [Sanity — Naming things](https://www.sanity.io/docs/apis-and-sdks/naming-things) ("Naming types in a singular form will improve the readability of your queries and code.")

## Context

PROD-1965 asked to rename blog document types to singular form. Investigation showed the **document type `name`s (`_type` values) were already singular** on staging (`post`, `author`, `blogCategory`, `blogTag`, `blogPage`, `contentWidget`, `page`, …), as were the schema `title`s. The plural strings the reporter saw were **Studio desk structure list labels** (`.title('Posts')` etc.) — display-only navigation text.

This ADR records the naming convention so the question doesn't recur, and so no future ticket attempts a literal `_type` rename without understanding the cost.

## Decision

1. **Document type `name` (`_type`): always singular, camelCase.** (`post`, not `posts`; `blogCategory`, not `blogCategories`.) Already true everywhere; binding for all new types.
2. **Schema `title`: always singular.** ("Post", "Blog Category".) Already true everywhere.
3. **Studio desk structure labels (`.title(...)` in `apps/studio/structure/`): singular** — house style decided via PROD-1965. ("Post", "Category", "Author", "Topic", "Widget", "Page".) Where a purely-singular label reads wrong, prefer a neutral label over broken grammar (e.g. the catch-all widget list is titled **"All"**, not "All Widget").
4. **Field names:** arrays keep natural plural (`tags`, `faqItems`); single references singular (`category`, `author`). Unchanged, recorded for completeness.

## Consequences

- **`_type` renames are content migrations, not renames.** Every document stores its `_type`; renaming one requires creating the new type, migrating documents, and rewriting references. Never do this from a bug ticket — it needs its own planned migration.
- PROD-1965's implementation is **display-only**: blog-scope desk labels singularized in `apps/studio/structure/index.ts` (both the Blog workspace items and the Admin workspace's Blog group). No queries, data, or frontend touched; Studio redeploy is the only rollout step.
- **Out of scope / follow-up candidate:** the www product/capability taxonomy desk labels still use plural ("Categories", "Types", "Capabilities", "Pages" in `websiteItems`). If full consistency is wanted, singularize them in a follow-up ticket under this ADR.
- New document types and desk sections MUST follow rules 1–3; reviewers should flag violations.
