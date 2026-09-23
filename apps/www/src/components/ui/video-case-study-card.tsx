'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

const CARD_WIDTH = 550;
/** Match `--motion-slow` — fade out before pause/reset. */
const VIDEO_FADE_MS = 500;

export type VideoCaseStudyMetric = {
    title: string;
    body: string;
};

export type VideoCaseStudyCardData = {
    id: string;
    brand: string;
    title: string;
    href: string;
    image: {src: string; alt: string};
    logo?: {src: string; alt: string} | null;
    /** Hosted MP4 for muted hover loop (typed card or caseStudy previewVideo). */
    videoSrc?: string | null;
    /** Single highlighted outcome shown in the footer. */
    metric?: VideoCaseStudyMetric | null;
};

type VideoCaseStudyCardProps = {
    card: VideoCaseStudyCardData;
    className?: string;
};

/**
 * Portrait case-study card — poster, optional muted MP4 hover, catalog-style
 * PakFactory mark reveal, soft black gradient footer. No YouTube on the card.
 */
export function VideoCaseStudyCard({
    card,
    className,
}: VideoCaseStudyCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [playing, setPlaying] = useState(false);

    const mp4Src = card.videoSrc?.trim() || null;
    const hasVideo = Boolean(mp4Src);
    const metric = card.metric;

    const clearFadeOutTimer = () => {
        if (fadeOutTimerRef.current != null) {
            clearTimeout(fadeOutTimerRef.current);
            fadeOutTimerRef.current = null;
        }
    };

    const resetVideoEl = () => {
        const el = videoRef.current;
        if (el) {
            el.pause();
            el.currentTime = 0;
        }
    };

    const stopVideo = () => {
        setPlaying(false);
        clearFadeOutTimer();
        fadeOutTimerRef.current = setTimeout(() => {
            resetVideoEl();
            fadeOutTimerRef.current = null;
        }, VIDEO_FADE_MS);
    };

    const startVideo = () => {
        if (!hasVideo) return;
        if (
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        clearFadeOutTimer();
        const el = videoRef.current;
        if (!el) return;
        void el.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
        );
    };

    useEffect(
        () => () => {
            clearFadeOutTimer();
            resetVideoEl();
        },
        [],
    );

    return (
        <Link
            href={card.href}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onMouseEnter={startVideo}
            onMouseLeave={stopVideo}
            onFocus={startVideo}
            onBlur={stopVideo}
            style={{width: CARD_WIDTH}}
            className={cn(
                'group relative flex aspect-[3/4] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] no-underline',
                'bg-muted text-white',
                className,
            )}
        >
            <Image
                src={card.image.src}
                alt=""
                fill
                sizes="550px"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                aria-hidden
                className="object-cover"
            />

            {mp4Src ? (
                <video
                    ref={videoRef}
                    src={mp4Src}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden
                    className={cn(
                        'absolute inset-0 size-full object-cover transition-opacity duration-[var(--motion-slow)] ease-in-out',
                        'motion-reduce:transition-none',
                        playing ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}

            <div className="relative z-10 flex justify-center p-6">
                {card.logo?.src ? (
                    <Image
                        src={card.logo.src}
                        alt={card.logo.alt || card.brand}
                        width={280}
                        height={80}
                        className="h-20 w-auto max-w-[280px] object-contain brightness-0 invert"
                    />
                ) : (
                    <p className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-white">
                        {card.brand}
                    </p>
                )}
            </div>

            {/* Detail affordance: faint at rest, catalog settle on hover */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute right-4 top-4 z-30 text-white',
                    'translate-x-[-5px] translate-y-[5px] opacity-15 delay-0',
                    'transition-[opacity,translate] duration-[var(--motion-slow)] ease-in-out',
                    'group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-75',
                    'group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:delay-75',
                    'motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none motion-reduce:delay-0',
                )}
            >
                <PakFactoryMarkIcon size={28} className="-rotate-15" />
            </div>

            <div className="relative z-10 mt-auto flex flex-col justify-end">
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-0 backdrop-blur-sm',
                        '[mask-image:linear-gradient(to_top,black_75%,transparent)]',
                        '[-webkit-mask-image:linear-gradient(to_top,black_75%,transparent)]',
                    )}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-transparent"
                />
                <div className="relative flex flex-col gap-2 p-6 pt-16">
                    {metric ? (
                        <>
                            <p className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">
                                {metric.title}
                            </p>
                            <p className="text-base leading-6 text-white/70">
                                {metric.body}
                            </p>
                        </>
                    ) : (
                        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[28px]">
                            {card.title}
                        </h3>
                    )}
                </div>
            </div>
        </Link>
    );
}
