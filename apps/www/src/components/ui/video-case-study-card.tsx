'use client';

import {useEffect, useRef, useState, type MouseEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Pause} from 'lucide-react';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {getYouTubeId, youtubeHoverEmbedSrc} from '@/lib/youtube';

const CARD_WIDTH = 550;

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
    /** Hosted MP4 for muted hover loop (typed cards). */
    videoSrc?: string | null;
    /** caseStudy heroMedia.videoUrl — muted controls-free YouTube hover. */
    youtubeUrl?: string | null;
    /** Single highlighted outcome shown in the glass footer. */
    metric?: VideoCaseStudyMetric | null;
};

type VideoCaseStudyCardProps = {
    card: VideoCaseStudyCardData;
    className?: string;
};

/**
 * Webflow-style portrait case-study card — poster, optional hover video
 * (MP4 or muted controls-free YouTube), centered brand, PakFactory mark,
 * glass footer.
 */
export function VideoCaseStudyCard({
    card,
    className,
}: VideoCaseStudyCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [userPaused, setUserPaused] = useState(false);

    const mp4Src = card.videoSrc?.trim() || null;
    const youtubeId =
        !mp4Src && card.youtubeUrl?.trim()
            ? getYouTubeId(card.youtubeUrl.trim())
            : null;
    const hasVideo = Boolean(mp4Src || youtubeId);
    const metric = card.metric;

    const stopVideo = () => {
        const el = videoRef.current;
        if (el) {
            el.pause();
            el.currentTime = 0;
        }
        setPlaying(false);
        setUserPaused(false);
    };

    const startVideo = () => {
        if (!hasVideo || userPaused) return;
        if (
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        if (youtubeId) {
            setPlaying(true);
            return;
        }

        const el = videoRef.current;
        if (!el) return;
        void el.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
        );
    };

    const handlePauseClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setUserPaused(true);
        const el = videoRef.current;
        if (el) {
            el.pause();
            el.currentTime = 0;
        }
        setPlaying(false);
    };

    useEffect(() => () => stopVideo(), []);

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
                className={cn(
                    'object-cover transition-opacity duration-300 ease-out',
                    playing ? 'opacity-0' : 'opacity-100',
                )}
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
                        'absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out',
                        playing ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}

            {youtubeId && playing ? (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {/*
                      Cover a 16:9 embed inside aspect-[3/4]: height = 100% of
                      card, width = height × 16/9 = 237.037% of card width.
                    */}
                    <iframe
                        src={youtubeHoverEmbedSrc(youtubeId)}
                        title=""
                        aria-hidden
                        allow="autoplay; encrypted-media"
                        tabIndex={-1}
                        className="absolute top-0 left-1/2 h-full w-[237.037%] max-w-none -translate-x-1/2 border-0"
                    />
                </div>
            ) : null}

            <div className="relative z-10 flex justify-center p-6">
                {card.logo?.src ? (
                    <Image
                        src={card.logo.src}
                        alt={card.logo.alt || card.brand}
                        width={280}
                        height={64}
                        className="h-16 w-auto max-w-[280px] object-contain brightness-0 invert"
                    />
                ) : (
                    <p className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-white">
                        {card.brand}
                    </p>
                )}
            </div>

            <span className="absolute top-3 right-3 z-10 flex size-14 items-center justify-center">
                <PakFactoryMarkIcon
                    size={36}
                    aria-hidden
                    className={cn(
                        'pointer-events-none -rotate-15 text-white transition-opacity duration-200 ease-out',
                        'motion-reduce:transition-none',
                        playing ? 'opacity-0' : 'opacity-30',
                    )}
                />
                {hasVideo ? (
                    <button
                        type="button"
                        aria-label="Pause video"
                        tabIndex={playing ? 0 : -1}
                        onClick={handlePauseClick}
                        className={cn(
                            'absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-out',
                            'motion-reduce:transition-none',
                            playing
                                ? 'pointer-events-auto opacity-100'
                                : 'pointer-events-none opacity-0',
                        )}
                    >
                        <Icon
                            icon={Pause}
                            size="lg"
                            className="size-9 text-white"
                        />
                    </button>
                ) : null}
            </span>

            <div className="relative z-10 mt-auto flex min-h-[42%] flex-col justify-end">
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-0',
                        'backdrop-blur-xl backdrop-saturate-150',
                        '[mask-image:linear-gradient(to_top,black_55%,transparent)]',
                        '[-webkit-mask-image:linear-gradient(to_top,black_55%,transparent)]',
                    )}
                />
                <div className="relative flex flex-col gap-2 p-6 pt-16">
                    {metric ? (
                        <>
                            <p className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
                                {metric.title}
                            </p>
                            <p className="text-base leading-6 text-white/70">
                                {metric.body}
                            </p>
                        </>
                    ) : (
                        <h3 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
                            {card.title}
                        </h3>
                    )}
                </div>
            </div>
        </Link>
    );
}
