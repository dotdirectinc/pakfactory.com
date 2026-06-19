import type { ComponentType } from "react";

import type { PageBuilderSection } from "@/components/sections/registry";
import { SECTION_COMPONENTS } from "@/components/sections/registry";

type SectionRendererProps = {
  /** The ordered `pageBuilder` array from a Sanity page document. */
  sections?: PageBuilderSection[] | null;
};

/**
 * Renders an ordered page-builder `sections` array (ADR-008). Array order is
 * page order. Each item is matched to a component by `_type` via the section
 * registry; an unregistered `_type` renders a dev-only placeholder (and `null`
 * in production) so a missing component never silently drops content.
 */
export function SectionRenderer({ sections }: SectionRendererProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => {
        const Component = SECTION_COMPONENTS[section._type] as unknown as
          | ComponentType<PageBuilderSection>
          | undefined;

        if (!Component) {
          return process.env.NODE_ENV === "development" ? (
            <UnknownSection key={section._key} type={section._type} />
          ) : null;
        }

        return <Component key={section._key} {...section} />;
      })}
    </>
  );
}

function UnknownSection({ type }: { type: string }) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      No section component registered for section type{" "}
      <code className="rounded bg-background px-1 py-0.5 font-mono">{type}</code>
      . Add it to <code>components/sections/registry.ts</code>.
    </div>
  );
}
