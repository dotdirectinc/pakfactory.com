'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Marquee} from '@pakfactory/ui/components/marquee';
import {cn} from '@pakfactory/ui/lib/utils';

export type LogoMarqueeItem = {
    id: string;
    name: string;
    imageSrc: string;
    href?: string;
    linkLabel?: string;
    width?: number;
    height?: number;
};

export type LogoMarqueeProps = {
    items: LogoMarqueeItem[];
    className?: string;
    /** Continuous scroll. Default true. When false, render a static row. */
    autoplay?: boolean;
    /** Marquee duration in seconds. Default 44. */
    duration?: number;
    /** Horizontal gap in rem for Marquee. Default 4.5 (~72px). */
    gap?: number;
    /** Soft edge fade mask. Default true. */
    edgeFade?: boolean;
    /** How many lap copies in the track. Default 4. */
    repeat?: number;
};

const DEFAULT_DURATION_S = 44;
const DEFAULT_GAP_REM = 4.5;
const DEFAULT_REPEAT = 4;
const DEFAULT_MARK_WIDTH = 128;
const DEFAULT_MARK_HEIGHT = 48;

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

function LogoMark({item}: {item: LogoMarqueeItem}) {
    const [failed, setFailed] = useState(false);
    const width = item.width ?? DEFAULT_MARK_WIDTH;
    const height = item.height ?? DEFAULT_MARK_HEIGHT;
    const showImage = Boolean(item.imageSrc) && !failed;

    const mark = showImage ? (
        <Image
            src={item.imageSrc}
            alt={item.name}
            width={width}
            height={height}
            className={cn(
                'h-full w-full object-contain opacity-55 grayscale',
                'transition-[opacity,filter] duration-300',
                'group-hover/mark:opacity-100 group-hover/mark:grayscale-0',
                'group-focus-visible/mark:opacity-100 group-focus-visible/mark:grayscale-0',
            )}
            onError={() => setFailed(true)}
        />
    ) : (
        <span className="whitespace-nowrap text-[19px] font-semibold uppercase leading-none tracking-[0.08em]">
            {item.name}
        </span>
    );

    const boxStyle = showImage ? {width, height} : undefined;

    if (item.href) {
        return (
            <Link
                href={item.href}
                aria-label={item.linkLabel ?? item.name}
                className={cn(
                    'group/mark inline-flex shrink-0 items-center justify-center rounded-md',
                    'text-foreground/45 no-underline transition-colors duration-300',
                    'hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
                )}
                style={boxStyle}
            >
                {mark}
            </Link>
        );
    }

    return (
        <span
            className="group/mark inline-flex shrink-0 items-center justify-center text-foreground/45"
            style={boxStyle}
        >
            {mark}
        </span>
    );
}

/**
 * Props-only scrolling strip of logo / brand marks.
 * Callers own section chrome and copy; no feature imports.
 */
export function LogoMarquee({
    items,
    className,
    autoplay = true,
    duration = DEFAULT_DURATION_S,
    gap = DEFAULT_GAP_REM,
    edgeFade = true,
    repeat = DEFAULT_REPEAT,
}: LogoMarqueeProps) {
    const reducedMotion = usePrefersReducedMotion();
    const scroll = autoplay && !reducedMotion;

    if (items.length === 0) {
        return null;
    }

    const marks = items.map((item) => (
        <LogoMark key={item.id} item={item} />
    ));

    return (
        <div
            className={cn(
                'relative w-full',
                edgeFade &&
                    '[mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]',
                className,
            )}
        >
            {scroll ? (
                <Marquee
                    pauseOnHover
                    gap={gap}
                    duration={duration}
                    repeat={repeat}
                    className={cn(
                        'p-0 [&>*]:items-center',
                        '[&:focus-within>*]:[animation-play-state:paused]',
                    )}
                >
                    {marks}
                </Marquee>
            ) : (
                <ul className="mx-auto flex max-w-[1200px] list-none flex-wrap items-center justify-center gap-x-16 gap-y-8">
                    {items.map((item) => (
                        <li key={item.id}>
                            <LogoMark item={item} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
