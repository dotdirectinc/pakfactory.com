'use client';

import type {ComponentPropsWithoutRef, MouseEvent, ReactNode} from 'react';

type InPageAnchorLinkProps = Omit<
    ComponentPropsWithoutRef<'a'>,
    'href'
> & {
    href: `#${string}`;
    children: ReactNode;
};

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * In-page hash link that smooth-scrolls to the target (instant under
 * reduced motion). Use inside `Button asChild` for heading CTAs.
 */
export function InPageAnchorLink({
    href,
    children,
    onClick,
    ...rest
}: InPageAnchorLinkProps) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        onClick?.(event);
        if (event.defaultPrevented) return;

        const id = href.slice(1);
        if (!id) return;

        const target = document.getElementById(id);
        if (!target) return;

        event.preventDefault();
        const behavior: ScrollBehavior = prefersReducedMotion()
            ? 'auto'
            : 'smooth';
        target.scrollIntoView({behavior, block: 'start'});

        if (window.location.hash !== href) {
            window.history.pushState(null, '', href);
        }
    }

    return (
        <a href={href} onClick={handleClick} {...rest}>
            {children}
        </a>
    );
}
