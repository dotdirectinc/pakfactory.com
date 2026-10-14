'use client';

import Image from 'next/image';
import {useState} from 'react';

import {SanityImage} from '@/components/ui/sanity-image';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {getYouTubeId} from '@/lib/youtube';

type VideoFacadeProps = {
    /** YouTube watch / short / embed URL. */
    videoUrl: string;
    /** Poster — Sanity CDN or any remote URL (e.g. i.ytimg.com). */
    thumbnailUrl: string | null;
    /** Accessible name and iframe title. */
    title: string;
    /** Poster alt; falls back to `title`. */
    alt?: string | null;
    sizes?: string;
    priority?: boolean;
};

/**
 * Click-to-play YouTube hero: a poster with a play button that swaps to a
 * `youtube-nocookie.com` embed in place, so the video plays on the page and
 * YouTube loads nothing until asked. Extracted from the case-study hero so
 * case studies and newsroom releases share one standard. Props-only (ADR-013).
 */
export function VideoFacade({
    videoUrl,
    thumbnailUrl,
    title,
    alt,
    sizes = '(max-width: 1024px) 100vw, 1280px',
    priority = false,
}: VideoFacadeProps) {
    const [playing, setPlaying] = useState(false);
    const videoId = getYouTubeId(videoUrl);
    const posterAlt = alt ?? title;

    if (playing && videoId) {
        return (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                    title={title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="absolute inset-0 size-full border-0"
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary"
            aria-label={`Play video: ${title}`}
        >
            {thumbnailUrl &&
                (isSanityCdnUrl(thumbnailUrl) ? (
                    <SanityImage
                        src={thumbnailUrl}
                        alt={posterAlt}
                        applyWatermark={false}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                        sizes={sizes}
                        priority={priority}
                    />
                ) : (
                    <Image
                        src={thumbnailUrl}
                        alt={posterAlt}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                        sizes={sizes}
                        priority={priority}
                    />
                ))}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                <div className="flex size-20 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-9 translate-x-0.5"
                        aria-hidden
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
        </button>
    );
}
