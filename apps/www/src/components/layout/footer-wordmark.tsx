'use client';

import {useEffect, useRef} from 'react';

/** Giant PAKFACTORY mark — slides up on scroll and settles still clipped (peek).
 *  Dotted grid is owned by SiteFooter’s meta+wordmark section wrapper.
 *
 *  gsap is imported on mount, not at module load (PROD-2756): this component
 *  sits in the `(site)` layout, so a static import shipped ~53 KB gz of gsap on
 *  every page and competed with first paint. Until it loads, CSS holds the mark
 *  in the same start position gsap uses (below the clip, or the 30% peek when
 *  motion is reduced), so there is no visible jump. */
export function FooterWordmark() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (!wrapperRef.current || !textRef.current) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        // Reduced motion: the CSS peek position is final; gsap is never loaded.
        if (prefersReducedMotion) return;

        let cancelled = false;
        let revert: (() => void) | undefined;

        void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
            ([{gsap}, {ScrollTrigger}]) => {
                const wrapper = wrapperRef.current;
                const text = textRef.current;
                if (cancelled || !wrapper || !text) return;

                gsap.registerPlugin(ScrollTrigger);
                const ctx = gsap.context(() => {
                    gsap.fromTo(
                        text,
                        {yPercent: 100},
                        {
                            yPercent: 30,
                            ease: 'none',
                            scrollTrigger: {
                                trigger: wrapper,
                                start: 'top bottom',
                                end: 'top 100%',
                                scrub: 1,
                            },
                        },
                    );
                }, wrapper);
                revert = () => ctx.revert();
            },
        );

        return () => {
            cancelled = true;
            revert?.();
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="relative z-10 w-full overflow-hidden py-4 md:py-5"
            aria-hidden="true"
        >
            <p
                ref={textRef}
                // `transform`, not Tailwind's translate-y-* (v4 emits the separate
                // `translate` property, which would stack with gsap's inline transform).
                className="mx-auto w-full select-none text-center text-[clamp(4rem,15vw,15rem)] font-black leading-none tracking-tight text-primary will-change-transform [transform:translateY(100%)] motion-reduce:[transform:translateY(30%)]"
            >
                PAKFACTORY
            </p>
        </div>
    );
}
