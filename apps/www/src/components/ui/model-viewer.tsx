'use client';

import {useEffect, useRef, useState, type HTMLAttributes} from 'react';
import type {ModelViewerElement} from '@google/model-viewer';
import {cn} from '@pakfactory/ui/lib/utils';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX augmentation
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': HTMLAttributes<ModelViewerElement> & {
                ref?: React.Ref<ModelViewerElement>;
                src: string;
                poster?: string;
                alt?: string;
                [attribute: `${string}-${string}`]: string | undefined;
            };
        }
    }
}

type ModelViewerProps = {
    /** GLB/glTF URL. */
    src: string;
    alt: string;
    /** Shown while the model downloads (the product photo). */
    poster?: string;
    /**
     * glTF clip driven by the open/close control. Authored as a CLOSING
     * sequence: frame 0 / rest pose = open, last frame = closed.
     */
    animationName?: string;
    /** Called when the model cannot load — caller falls back to the photo. */
    onError?: () => void;
    className?: string;
};

/**
 * Interactive 3D model (drag to rotate, scroll/pinch to zoom) via
 * `@google/model-viewer`. Props-only; the web component is imported on mount,
 * so nothing ships until a viewer actually renders.
 */
export function ModelViewer({
    src,
    alt,
    poster,
    animationName,
    onError,
    className,
}: ModelViewerProps) {
    const ref = useRef<ModelViewerElement>(null);
    const [ready, setReady] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    });

    useEffect(() => {
        let cancelled = false;
        import('@google/model-viewer')
            .then(() => {
                if (!cancelled) setReady(true);
            })
            .catch(() => onErrorRef.current?.());
        setReducedMotion(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!ready || !el) return;
        const handleLoad = () => setLoaded(true);
        const handleError = () => onErrorRef.current?.();
        el.addEventListener('load', handleLoad);
        el.addEventListener('error', handleError);
        return () => {
            el.removeEventListener('load', handleLoad);
            el.removeEventListener('error', handleError);
        };
    }, [ready]);

    const toggleClosed = () => {
        const el = ref.current;
        if (!el) return;
        const next = !isClosed;
        // One-shot clip, clamped on its last frame — play forward to close,
        // backward to open again.
        el.timeScale = next ? 1 : -1;
        el.play({repetitions: 1, pingpong: false});
        setIsClosed(next);
    };

    return (
        <div className={cn('relative size-full', className)}>
            {ready ? (
                <model-viewer
                    ref={ref}
                    src={src}
                    poster={poster}
                    alt={alt}
                    camera-controls=""
                    touch-action="pan-y"
                    interaction-prompt="auto"
                    shadow-intensity="1"
                    animation-name={animationName}
                    auto-rotate={reducedMotion ? undefined : ''}
                    auto-rotate-delay="1500"
                    rotation-per-second="20deg"
                    className="block size-full bg-muted"
                />
            ) : poster ? (
                <img src={poster} alt={alt} className="size-full object-cover" />
            ) : null}

            {animationName && loaded ? (
                <button
                    type="button"
                    onClick={toggleClosed}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 cursor-pointer rounded-full border border-border bg-background/90 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                >
                    {isClosed ? 'Open box' : 'Close box'}
                </button>
            ) : null}
        </div>
    );
}
