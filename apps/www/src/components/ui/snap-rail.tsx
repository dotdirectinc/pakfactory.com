'use client';

import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type SnapRailProps = {
    /** Accessible name for the list (and the arrow labels). */
    label: string;
    /** `<li>` children — each a snap point (`snap-start`). */
    children: ReactNode;
    className?: string;
};

/**
 * Horizontal rail on native CSS scroll-snap — trackpad, touch and keyboard
 * focus move it for free; the arrows page by one item and disable at the ends.
 * Bleeds right past the dieline gutter so the rail reads as continuing.
 * Props-only (POC `CarouselRail` parity, autoplay off).
 */
export function SnapRail({label, children, className}: SnapRailProps) {
    const railRef = useRef<HTMLUListElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const sync = useCallback(() => {
        const el = railRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setAtStart(el.scrollLeft <= 1);
        setAtEnd(el.scrollLeft >= max - 1);
    }, []);

    useEffect(() => {
        sync();
        const el = railRef.current;
        if (!el) return undefined;
        el.addEventListener('scroll', sync, {passive: true});
        window.addEventListener('resize', sync);
        return () => {
            el.removeEventListener('scroll', sync);
            window.removeEventListener('resize', sync);
        };
    }, [sync]);

    const page = useCallback((direction: 1 | -1) => {
        const el = railRef.current;
        if (!el) return;
        const item = el.querySelector('li');
        const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
        const step = item ? item.getBoundingClientRect().width + gap : el.clientWidth;
        el.scrollBy({
            left: direction * step,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
        });
    }, []);

    return (
        <div className={cn('flex flex-col gap-6', className)}>
            <ul
                ref={railRef}
                aria-label={label}
                className="-mr-layout-gutter-inner flex snap-x snap-mandatory gap-6 overflow-x-auto pr-layout-gutter-inner pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {children}
            </ul>
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="rounded-full"
                    onClick={() => page(-1)}
                    disabled={atStart}
                    aria-label={`Previous ${label.toLowerCase()}`}
                >
                    <Icon icon={ArrowLeft} />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="rounded-full"
                    onClick={() => page(1)}
                    disabled={atEnd}
                    aria-label={`Next ${label.toLowerCase()}`}
                >
                    <Icon icon={ArrowRight} />
                </Button>
            </div>
        </div>
    );
}
