'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {mediaDissolveTransitionClass} from '@/lib/ui/media-dissolve';

export type UseSanityImageSettleOptions = {
  /** Fires once when the image first becomes ready (load, error, or cached). */
  onReady?: () => void;
};

export type UseSanityImageSettleResult = {
  ready: boolean;
  onLoad: () => void;
  onError: () => void;
  /** Opacity dissolve classes — compose onto {@link SanityImage} `className`. */
  imageClassName: string;
};

/**
 * Thin settle helpers for Sanity CDN images: start transparent over muted
 * chrome, dissolve in when decoded (PROD-3102). Call sites own the under-layer.
 */
export function useSanityImageSettle(
  src: string | undefined,
  options?: UseSanityImageSettleOptions,
): UseSanityImageSettleResult {
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(options?.onReady);
  onReadyRef.current = options?.onReady;
  const notifiedRef = useRef(false);

  useEffect(() => {
    setReady(false);
    notifiedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!ready || notifiedRef.current) return;
    notifiedRef.current = true;
    onReadyRef.current?.();
  }, [ready]);

  const markReady = useCallback(() => {
    setReady(true);
  }, []);

  return {
    ready,
    onLoad: markReady,
    onError: markReady,
    imageClassName: cn(
      mediaDissolveTransitionClass,
      ready ? 'opacity-100' : 'opacity-0',
    ),
  };
}
