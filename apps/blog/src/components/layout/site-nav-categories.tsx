'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {NavSearchForm} from '@/components/modules/search-form';
import {cn} from '@pakfactory/ui/lib/utils';
import type {BlogCategoryChip} from '@/lib/blog-categories';
import {categoryHref} from '@/lib/blog-post-url';

type SiteNavCategoriesProps = {
    categories: BlogCategoryChip[];
};

export function SiteNavCategories({categories}: SiteNavCategoriesProps) {
    const pathname = usePathname();

    return (
        <div className="hidden w-full items-center justify-between lg:flex">
            {categories.length > 0 ? (
                <nav
                    className="flex min-w-0 flex-1 items-center gap-8 text-base font-medium"
                    aria-label="Blog categories"
                >
                    {categories.map(({slug, title}) => {
                        const href = categoryHref(slug);
                        const isActive =
                            pathname === href ||
                            pathname.startsWith(`${href}/page/`);
                        return (
                            <Link
                                key={slug}
                                href={href}
                                className={cn(
                                    'text-foreground transition-colors hover:text-primary',
                                    isActive && 'font-semibold text-primary',
                                )}
                            >
                                {title}
                            </Link>
                        );
                    })}
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
