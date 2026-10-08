'use client';

import {useEffect, useRef} from 'react';

/** Giant PAKFACTORY mark — slides up on scroll and settles still clipped (peek).
 *  Dotted grid is owned by SiteFooter’s meta+wordmark section wrapper.
 *
 *  gsap is imported only when the footer nears the viewport, not at module load
 *  (PROD-2756) or on mount (PROD-2958): this component sits in the `(site)`
 *  layout, so gsap would otherwise load on every page and keep ScrollTrigger's
 *  frame loop running from first paint. Until it loads, CSS holds the mark
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

        const loadAnimation = () =>
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

        // Load gsap only when the footer is about to scroll into view (PROD-2958).
        // Once registered, ScrollTrigger runs a requestAnimationFrame loop on every
        // frame; loading it on mount kept the main thread busy on every page load,
        // long before the wordmark could move.
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                loadAnimation();
            },
            {rootMargin: '0px 0px 600px 0px'},
        );
        observer.observe(wrapperRef.current);

        return () => {
            cancelled = true;
            observer.disconnect();
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
