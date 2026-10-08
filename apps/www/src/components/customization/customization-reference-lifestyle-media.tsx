'use client';

import {useEffect, useRef} from 'react';

import {SanityImage} from '@/components/ui/sanity-image';
import {usePrefersReducedMotion} from '@/lib/ui/use-prefers-reduced-motion';

type CustomizationReferenceLifestyleMediaProps = {
    videoUrl?: string | null;
    imageSrc?: string | null;
    imageAlt: string;
};

/**
 * Sticky Benefits/Specs lifestyle media — primary lifestyle video, else image.
 * Reduced motion skips autoplay and shows the still.
 */
export function CustomizationReferenceLifestyleMedia({
    videoUrl,
    imageSrc,
    imageAlt,
}: CustomizationReferenceLifestyleMediaProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const playableVideo = Boolean(videoUrl?.trim()) && !prefersReducedMotion;
    const stillSrc = imageSrc?.trim() || null;

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !playableVideo) return;
        void el.play().catch(() => {
            /* autoplay blocked — still/poster remains */
        });
    }, [playableVideo, videoUrl]);

    if (!playableVideo && !stillSrc) return null;

    return (
        <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted">
                {stillSrc ? (
                    <SanityImage
                        src={stillSrc}
                        alt={imageAlt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover"
                    />
                ) : null}
                {playableVideo && videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="absolute inset-0 size-full object-cover"
                        muted
                        playsInline
                        loop
                        autoPlay
                        poster={stillSrc ?? undefined}
                        aria-label={imageAlt}
                    />
                ) : null}
            </div>
        </div>
    );
}
