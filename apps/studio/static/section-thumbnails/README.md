# Section insert-menu thumbnails

WebP files named `{_type}.webp` for the Studio sections grid insert menu
(ADR-020 §10). Register each `_type` in
[`../schemas/sections/section-preview.ts`](../schemas/sections/section-preview.ts)
or the grid falls back to the schema icon.

**Beauty-first set (v1):** logoWall, inspirationsGrid, mediaFeature,
expertiseSequence, caseStudiesRow, videoCaseStudiesRow, faqSection, quoteCta,
solutionsRow.

Current files are **placeholder layout chrome** (~640×360). Replace with real
band screenshots from staging when design ships art — keep filenames and the
preview Set entry.
