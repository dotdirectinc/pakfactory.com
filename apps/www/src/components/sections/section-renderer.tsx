import {Suspense, type ComponentType} from 'react';

import {
    SECTION_COMPONENTS,
    type PageSection,
} from '@/components/sections/registry';

/** Host-supplied renderers for specific `_type`s (see {@link SectionRendererProps.components}). */
export type SectionComponentOverrides = Partial<
    Record<string, ComponentType<PageSection>>
>;

type SectionRendererProps = {
    /** Ordered `sections` array from a Sanity page document. */
    sections?: PageSection[] | null;
    /**
     * Per-host overrides, keyed by `_type`. Lets a feature render a Section
     * with page context the page-agnostic registry cannot know (e.g. the
     * expertise stage page shows `expertiseSequence` as a path with the current
     * stage highlighted). Same data, different host — the CMS stores no variant.
     */
    components?: SectionComponentOverrides;
};

/**
 * Renders an ordered page `sections` array (ADR-015, ADR-020).
 * Unregistered `_type` → null in production; amber placeholder in development.
 * `testimonialsRow` is Suspense-wrapped so Places fetch does not block above-fold.
 */
export function SectionRenderer({sections, components}: SectionRendererProps) {
    if (!sections || sections.length === 0) return null;

    return (
        <>
            {sections.map((section) => {
                const Component = (components?.[section._type] ??
                    SECTION_COMPONENTS[section._type]) as
                    | ComponentType<PageSection>
                    | undefined;

                if (!Component) {
                    return process.env.NODE_ENV === 'development' ? (
                        <UnknownSection
                            key={section._key}
                            type={section._type}
                        />
                    ) : null;
                }

                if (section._type === 'testimonialsRow') {
                    return (
                        <Suspense key={section._key} fallback={null}>
                            <Component {...section} />
                        </Suspense>
                    );
                }

                return <Component key={section._key} {...section} />;
            })}
        </>
    );
}

function UnknownSection({type}: {type: string}) {
    return (
        <div
            role="alert"
            className="my-4 rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-950"
        >
            No section component registered for type{' '}
            <code className="rounded bg-background px-1 py-0.5 font-mono">
                {type}
            </code>
            . Add it to{' '}
            <code className="rounded bg-background px-1 py-0.5 font-mono">
                components/sections/registry.tsx
            </code>
            .
        </div>
    );
}
