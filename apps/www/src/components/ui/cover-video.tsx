'use client';

import {useEffect, useRef, useState} from 'react';

import {cn} from '@pakfactory/ui/lib/utils';

import {isSanityCdnUrl, sanityImageLoader} from '@/lib/sanity/image';
import {usePrefersReducedMotion} from '@/lib/ui/use-prefers-reduced-motion';

/** Poster width when the caller does not pass one: covers a full-bleed hero at 1x. */
const DEFAULT_POSTER_WIDTH = 1600;
const POSTER_QUALITY = 75;
/** Start fetching a little before the video scrolls into view. */
const IN_VIEW_ROOT_MARGIN = '200px';

export type CoverVideoProps = {
    /** Playable MP4/MOV URL. */
    src: string;
    /**
     * Still shown until the first frame. Sanity CDN URLs are resized to
     * `posterWidth`; omit it when an image already renders underneath.
     */
    poster?: string;
    /** Requested poster width in px for Sanity CDN posters. Default 1600. */
    posterWidth?: number;
    /** Play when true, pause when false. Default true. */
    active?: boolean;
    className?: string;
    /** Fired when the element cannot decode/play — parent should show a still. */
    onError?: () => void;
};

/** Sized, format-negotiated Sanity URL; any other URL passes through unchanged. */
function resolvePoster(poster: string | undefined, width: number) {
    const trimmed = poster?.trim();
    if (!trimmed) return undefined;
    if (!isSanityCdnUrl(trimmed)) return trimmed;
    return sanityImageLoader({src: trimmed, width, quality: POSTER_QUALITY});
}

/**
 * Props-only muted looping video for ambient / cover surfaces.
 * Honors reduced-motion by not mounting (parent owns the still fallback).
 * Loads nothing until it is near the viewport (`preload="none"`), then plays
 * only while `active` and in view.
 */
export function CoverVideo({
    src,
    poster,
    posterWidth = DEFAULT_POSTER_WIDTH,
    active = true,
    className,
    onError,
}: CoverVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onErrorRef = useRef(onError);
    const reduceMotion = usePrefersReducedMotion();
    const [failed, setFailed] = useState(false);
    const [inView, setInView] = useState(false);
    const trimmed = src.trim();
    const show = Boolean(trimmed) && !reduceMotion && !failed;
    const posterUrl = resolvePoster(poster, posterWidth);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        setFailed(false);
    }, [trimmed]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !show) return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry?.isIntersecting ?? false),
            {rootMargin: IN_VIEW_ROOT_MARGIN},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [show]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !show) return;
        if (active && inView) {
            void el.play().catch((error: unknown) => {
                // A pause() racing a pending play() rejects with AbortError — not a decode failure.
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setFailed(true);
                onErrorRef.current?.();
            });
        } else {
            el.pause();
        }
    }, [active, inView, show, trimmed]);

    if (!show) return null;

    return (
        <video
            ref={videoRef}
            src={trimmed}
            poster={posterUrl}
            preload="none"
            muted
            loop
            playsInline
            className={cn('absolute inset-0 size-full object-cover', className)}
            onError={() => {
                setFailed(true);
                onErrorRef.current?.();
            }}
        />
    );
}
