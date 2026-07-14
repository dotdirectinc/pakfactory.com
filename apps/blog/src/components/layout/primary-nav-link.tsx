'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {externalLinkAttributes} from '@/lib/external-link';
import type {BlogPrimaryNavItem} from '@/lib/blog-primary-nav';

type PrimaryNavLinkProps = {
    item: BlogPrimaryNavItem;
    className?: string;
    onClick?: () => void;
    trailing?: ReactNode;
    activeClassName?: string;
};

function isPrimaryNavItemActive(
    pathname: string,
    item: BlogPrimaryNavItem,
): boolean {
    if (item.external) return false;

    const {href, categorySlug} = item;
    if (categorySlug) {
        return pathname === href || pathname.startsWith(`${href}/page/`);
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNavLink({
    item,
    className,
    onClick,
    trailing,
    activeClassName = 'font-semibold text-primary',
}: PrimaryNavLinkProps) {
    const pathname = usePathname();
    const isActive = isPrimaryNavItemActive(pathname, item);
    const content = (
        <>
            {item.label}
            {trailing}
        </>
    );

    if (item.external) {
        return (
            <a
                href={item.href}
                onClick={onClick}
                className={className}
                {...externalLinkAttributes(item.href)}
            >
                {content}
            </a>
        );
    }

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(className, isActive && activeClassName)}
        >
            {content}
        </Link>
    );
}

export {isPrimaryNavItemActive};
