/**
 * PROD-3211 — copy for the configurator's option LIST card (two lines).
 * Prefer authored `highlights` fragments; fall back to `shortDescription`.
 * Never the long/glossary `description` — that belongs on the detail pane.
 */
export function optionCardBlurb(option: {
    highlights?: string | null;
    shortDescription?: string | null;
}): string {
    return option.highlights?.trim() || option.shortDescription?.trim() || '';
}
