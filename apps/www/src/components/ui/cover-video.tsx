'use client';

import {useEffect, useRef, useState} from 'react';

import {cn} from '@pakfactory/ui/lib/utils';

import {usePrefersReducedMotion} from '@/lib/ui/use-prefers-reduced-motion';

export type CoverVideoProps = {
    /** Playable MP4/MOV URL. */
    src: string;
    poster?: string;
    /** Play when true, pause when false. Default true. */
    active?: boolean;
    className?: string;
    /** Fired when the element cannot decode/play — parent should show a still. */
    onError?: () => void;
};

/**
 * Props-only muted looping video for ambient / cover surfaces.
 * Honors reduced-motion by not mounting (parent owns the still fallback).
 */
export function CoverVideo({
    src,
    poster,
    active = true,
    className,
    onError,
}: CoverVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onErrorRef = useRef(onError);
    const reduceMotion = usePrefersReducedMotion();
    const [failed, setFailed] = useState(false);
    const trimmed = src.trim();
    const show = Boolean(trimmed) && !reduceMotion && !failed;

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        setFailed(false);
    }, [trimmed]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !show) return;
        if (active) {
            void el.play().catch(() => {
                setFailed(true);
                onErrorRef.current?.();
            });
        } else {
            el.pause();
        }
    }, [active, show, trimmed]);

    if (!show) return null;

    return (
        <video
            ref={videoRef}
            src={trimmed}
            poster={poster?.trim() || undefined}
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
