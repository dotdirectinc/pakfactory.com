'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

export type AnchorNavItem = {
    id: string;
    label: string;
};

type AnchorNavProps = {
    items: AnchorNavItem[];
    className?: string;
    /**
     * When true, render as an in-band child (no PageDielineSection).
     * Use inside a parent that already owns the dieline shell.
     */
    embedded?: boolean;
};

/**
 * Sticky in-page jump nav — scroll-spy + sliding underline (customization-tab pattern).
 * Items target element ids on the page (e.g. PDP section anchors).
 */
export function AnchorNav({items, className, embedded = false}: AnchorNavProps) {
    const [activeId, setActiveId] = useState(items[0]?.id ?? '');
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [indicator, setIndicator] = useState({
        left: 0,
        width: 0,
        ready: false,
    });
    const [indicatorTransitionEnabled, setIndicatorTransitionEnabled] =
        useState(false);

    const navRef = useRef<HTMLElement>(null);
    const tabRefs = useRef(new Map<string, HTMLButtonElement>());

    const updateIndicator = useCallback(() => {
        const nav = navRef.current;
        const target = hoveredId ?? activeId;
        const btn = tabRefs.current.get(target);
        if (!nav || !btn) {
            setIndicator((prev) =>
                prev.ready ? {...prev, ready: false} : prev,
            );
            return;
        }
        const navRect = nav.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setIndicator({
            left: btnRect.left - navRect.left + nav.scrollLeft,
            width: btnRect.width,
            ready: true,
        });
    }, [activeId, hoveredId]);

    useLayoutEffect(() => {
        updateIndicator();
        const nav = navRef.current;
        const ro =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => updateIndicator())
                : null;
        if (nav && ro) ro.observe(nav);
        window.addEventListener('resize', updateIndicator);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', updateIndicator);
        };
    }, [updateIndicator, items]);

    useEffect(() => {
        if (indicator.ready) setIndicatorTransitionEnabled(true);
    }, [indicator.ready]);

    useEffect(() => {
        if (items.length === 0) return;

        const elements = items
            .map((item) => document.getElementById(item.id))
            .filter((el): el is HTMLElement => el != null);

        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                const top = visible[0]?.target;
                if (top?.id) setActiveId(top.id);
            },
            {
                rootMargin: '-20% 0px -55% 0px',
                threshold: [0, 0.25, 0.5],
            },
        );

        for (const el of elements) observer.observe(el);
        return () => observer.disconnect();
    }, [items]);

    const onNavigate = useCallback((id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        setActiveId(id);
        el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, []);

    if (items.length < 2) return null;

    const nav = (
        <nav
            ref={navRef}
            aria-label="On this page"
            className="relative flex items-stretch gap-x-6 overflow-x-auto"
            onMouseLeave={() => setHoveredId(null)}
        >
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none absolute bottom-0 z-10 h-1 bg-primary',
                    indicatorTransitionEnabled &&
                        'transition-[left,width,opacity] duration-300 ease-out',
                    indicator.ready ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                    left: indicator.left,
                    width: indicator.width,
                }}
            />
            {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                    <button
                        key={item.id}
                        ref={(el) => {
                            if (el) {
                                tabRefs.current.set(item.id, el);
                            } else {
                                tabRefs.current.delete(item.id);
                            }
                        }}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        className={cn(
                            'relative shrink-0 py-4 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                            isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-primary',
                        )}
                        aria-current={isActive ? 'true' : undefined}
                    >
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );

    if (embedded) {
        return (
            <div
                className={cn(
                    'sticky top-0 z-40 -mx-layout-gutter-inner border-b border-dashed border-border bg-background px-layout-gutter-inner',
                    className,
                )}
            >
                {nav}
            </div>
        );
    }

    return (
        <div className={cn('sticky top-0 z-40 bg-background', className)}>
            <PageDielineSection borderBottom band="default">
                {nav}
            </PageDielineSection>
        </div>
    );
}
