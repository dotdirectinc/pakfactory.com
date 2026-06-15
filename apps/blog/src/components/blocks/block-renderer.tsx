import type { ComponentType } from "react";

import type { PageBuilderBlock } from "@/components/blocks/registry";
import { BLOCK_COMPONENTS } from "@/components/blocks/registry";

type BlockRendererProps = {
  /** The ordered `pageBuilder` array from a Sanity page document. */
  blocks?: PageBuilderBlock[] | null;
};

/**
 * Renders an ordered page-builder `blocks` array (ADR-008). Array order is
 * page order. Each item is matched to a component by `_type` via the block
 * registry; an unregistered `_type` renders a dev-only placeholder (and `null`
 * in production) so a missing component never silently drops content.
 */
export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block) => {
        const Component = BLOCK_COMPONENTS[block._type] as unknown as
          | ComponentType<PageBuilderBlock>
          | undefined;

        if (!Component) {
          return process.env.NODE_ENV === "development" ? (
            <UnknownBlock key={block._key} type={block._type} />
          ) : null;
        }

        return <Component key={block._key} {...block} />;
      })}
    </>
  );
}

function UnknownBlock({ type }: { type: string }) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      No block component registered for block type{" "}
      <code className="rounded bg-background px-1 py-0.5 font-mono">{type}</code>
      . Add it to <code>components/blocks/registry.ts</code>.
    </div>
  );
}
