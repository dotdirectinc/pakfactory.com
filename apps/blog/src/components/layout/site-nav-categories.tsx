'use client';

import {NavSearchForm} from '@/components/modules/search-form';
import {PrimaryNavLink} from '@/components/layout/primary-nav-link';
import type {BlogPrimaryNavItem} from '@/lib/blog-primary-nav';

type SiteNavCategoriesProps = {
    navItems: BlogPrimaryNavItem[];
};

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
                            className="text-foreground transition-colors hover:text-primary"
                        />
                    ))}
                </nav>
            ) : (
                <div className="min-w-0 flex-1" />
            )}

            <NavSearchForm
                id="site-nav-search"
                className="shrink-0"
                fieldClassName="w-[240px]"
            />
        </div>
    );
}
