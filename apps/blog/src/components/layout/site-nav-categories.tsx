'use client';

import {NavSearchForm} from '@/components/modules/search-form';
import {PrimaryNavLink} from '@/components/layout/primary-nav-link';
import type {BlogPrimaryNavItem} from '@/lib/blog-primary-nav';

type SiteNavCategoriesProps = {
    navItems: BlogPrimaryNavItem[];
};

/**
 * POC "F2 motif" — on hover the 2px primary underline draws in left→right
 * (300ms ease-out), then a half-arrowhead tick fades in at the right end
 * (150→200ms, 200ms delay). Pure CSS via group-hover; decorative only.
 */
function NavUnderlineMotif() {
    return (
        <>
            <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 ease-out group-hover/nav:scale-x-100"
            />
            <svg
                aria-hidden="true"
                viewBox="0 0 8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="absolute bottom-[-7px] right-0 size-2 -translate-x-1 overflow-visible text-primary opacity-0 transition-all duration-150 ease-out group-hover/nav:translate-x-0 group-hover/nav:opacity-100 group-hover/nav:delay-200 group-hover/nav:duration-200"
            >
                <path d="M8 0 L2 6" />
            </svg>
        </>
    );
}

export function SiteNavCategories({navItems}: SiteNavCategoriesProps) {
    return (
        <div className="hidden w-full items-center justify-between lg:flex">
            {navItems.length > 0 ? (
                <nav
                    className="flex min-w-0 flex-1 items-center gap-8 text-sm font-medium"
                    aria-label="Blog navigation"
                >
                    {navItems.map((item) => (
                        <PrimaryNavLink
                            key={item.key}
                            item={item}
                            className="group/nav relative inline-block pb-1 text-foreground transition-colors duration-200 hover:text-primary"
                            trailing={<NavUnderlineMotif />}
                        />
                    ))}
                </nav>
            ) : (
                <div className="min-w-0 flex-1" />
            )}

            <NavSearchForm
                id="site-nav-search"
                className="shrink-0"
                fieldClassName="w-[240px] transition-[width] duration-300 ease-out focus-within:w-[320px] motion-reduce:transition-none"
            />
        </div>
    );
}
