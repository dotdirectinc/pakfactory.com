'use client';

import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {Marquee} from '@pakfactory/ui/components/marquee';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Pause, Play} from 'lucide-react';

import {TestimonialAggregateFooter} from '@/components/ui/testimonial-aggregate-footer';
import {TestimonialCard} from '@/components/ui/testimonial-card';
import type {
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';

const ROW_A_DURATION_S = 55;
const ROW_B_DURATION_S = 75;
/** Horizontal card gap and vertical gap between the two rows (rem). */
const MARQUEE_GAP_REM = 1.5;
const MARQUEE_REPEAT = 4;

const CARD_CLASS =
    'min-w-[min(24rem,85vw)] max-w-[min(24rem,85vw)] shrink-0';

const gapStyle = {
    gap: `${MARQUEE_GAP_REM}rem`,
} satisfies CSSProperties;

type TestimonialsMarqueeBandProps = {
    items: ProductTestimonial[];
    aggregate?: TestimonialsAggregate;
    className?: string;
};

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return reduced;
}

function splitTracks(items: ProductTestimonial[]): {
    rowA: ProductTestimonial[];
    rowB: ProductTestimonial[];
} {
    const even = items.filter((_, i) => i % 2 === 0);
    const odd = items.filter((_, i) => i % 2 === 1);

    return {
        rowA: even.length >= 2 ? even : items,
        rowB: odd.length >= 2 ? odd : items,
    };
}

function MarqueeCards({
    items,
    keyPrefix,
}: {
    items: ProductTestimonial[];
    keyPrefix: string;
}) {
    return items.map((item, index) => (
        <TestimonialCard
            key={`${keyPrefix}-${item.attributionName}-${index}`}
            item={item}
            className={CARD_CLASS}
        />
    ));
}

function MarqueeFooter({
    aggregate,
    pauseControl,
}: {
    aggregate?: TestimonialsAggregate;
    pauseControl?: ReactNode;
}) {
    if (!aggregate && !pauseControl) return null;

    return (
        <div className="flex items-center gap-4">
            {aggregate ? (
                <TestimonialAggregateFooter aggregate={aggregate} />
            ) : null}
            {pauseControl ? (
                <div className="ml-auto shrink-0">{pauseControl}</div>
            ) : null}
        </div>
    );
}

/**
 * Apple Books–style dual-speed testimonial marquee (pause only, no arrows).
 */
export function TestimonialsMarqueeBand({
    items,
    aggregate,
    className,
}: TestimonialsMarqueeBandProps) {
    const reducedMotion = usePrefersReducedMotion();
    const [paused, setPaused] = useState(false);

    if (items.length === 0) return null;

    const {rowA, rowB} = splitTracks(items);

    const pauseControl = reducedMotion ? null : (
        <Button
            type="button"
            variant="default"
            size="icon"
            className="rounded-full bg-foreground text-background hover:bg-foreground/90"
            aria-pressed={paused}
            aria-label={paused ? 'Play reviews' : 'Pause reviews'}
            onClick={() => setPaused((value) => !value)}
        >
            {paused ? (
                <Play className="size-4" fill="currentColor" aria-hidden />
            ) : (
                <Pause className="size-4" fill="currentColor" aria-hidden />
            )}
        </Button>
    );

    if (reducedMotion) {
        return (
            <div className={cn('flex flex-col', className)} style={gapStyle}>
                <div
                    className="flex flex-col overflow-x-auto pb-2"
                    style={gapStyle}
                >
                    <ul
                        className="flex list-none"
                        style={gapStyle}
                    >
                        {rowA.map((item, index) => (
                            <li key={`static-a-${index}`} className={CARD_CLASS}>
                                <TestimonialCard item={item} />
                            </li>
                        ))}
                    </ul>
                    <ul
                        className="flex list-none"
                        style={gapStyle}
                    >
                        {rowB.map((item, index) => (
                            <li key={`static-b-${index}`} className={CARD_CLASS}>
                                <TestimonialCard item={item} />
                            </li>
                        ))}
                    </ul>
                </div>
                <MarqueeFooter aggregate={aggregate} />
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col', className)} style={gapStyle}>
            <div
                className={cn(
                    'flex flex-col',
                    'relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen max-w-[100vw]',
                    '[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]',
                )}
                style={gapStyle}
            >
                <Marquee
                    pauseOnHover
                    gap={MARQUEE_GAP_REM}
                    duration={ROW_A_DURATION_S}
                    repeat={MARQUEE_REPEAT}
                    className={cn(
                        'p-0',
                        paused && '[&>*]:[animation-play-state:paused]',
                    )}
                >
                    <MarqueeCards items={rowA} keyPrefix="a" />
                </Marquee>
                <Marquee
                    pauseOnHover
                    reverse
                    gap={MARQUEE_GAP_REM}
                    duration={ROW_B_DURATION_S}
                    repeat={MARQUEE_REPEAT}
                    className={cn(
                        'p-0',
                        paused && '[&>*]:[animation-play-state:paused]',
                    )}
                >
                    <MarqueeCards items={rowB} keyPrefix="b" />
                </Marquee>
            </div>

            <MarqueeFooter
                aggregate={aggregate}
                pauseControl={pauseControl}
            />
        </div>
    );
}
