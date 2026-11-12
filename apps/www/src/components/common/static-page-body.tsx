import type {ReactNode} from 'react';
import Link from 'next/link';
import {
    PageDielineSection,
    type PageDielineAs,
} from '@pakfactory/ui/components/page-dieline-section';

type StaticPageBodyProps = {
    children: ReactNode;
    /** Polymorphic dieline root. Default `div`. */
    as?: PageDielineAs;
};

/**
 * Body band for textarea static pages (legal detail, policies index).
 * Keeps the section dieline (dashed left/right) under the heading, with a
 * narrow centered column for the words — same measure as the Privacy Policy
 * reference. The heading’s bottom rule is the divider; no extra top border.
 * Do not use for the HTML sitemap — that needs {@link StaticPageWideBody}.
 */
export function StaticPageBody({children, as = 'div'}: StaticPageBodyProps) {
    return (
        <PageDielineSection as={as} paddingBlock="md">
            <div className="mx-auto w-full max-w-3xl">{children}</div>
        </PageDielineSection>
    );
}

/**
 * Full-width dieline body (same chrome as {@link StaticPageBody}, no narrow
 * column). For pages that need the full `--layout-max` measure — e.g. the
 * HTML sitemap multi-column grids.
 */
export function StaticPageWideBody({
    children,
    as = 'div',
}: StaticPageBodyProps) {
    return (
        <PageDielineSection as={as} paddingBlock="md">
            {children}
        </PageDielineSection>
    );
}

export type StaticPageLinkItem = {
    href: string;
    label: string;
    /** Optional muted line under the link (e.g. “Last updated …”). */
    description?: string | null;
};

/** Shared link list for the policies index (not the HTML sitemap). */
export function StaticPageLinkList({items}: {items: StaticPageLinkItem[]}) {
    if (items.length === 0) return null;

    return (
        <ul className="space-y-4">
            {items.map((item) => (
                <li key={item.href}>
                    <Link
                        href={item.href}
                        className="text-lg font-medium text-foreground underline underline-offset-4 hover:no-underline"
                    >
                        {item.label}
                    </Link>
                    {item.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                        </p>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}
