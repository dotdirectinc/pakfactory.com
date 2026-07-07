'use client';

import {useLayoutEffect, useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function FooterWordmark() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLParagraphElement>(null);

    useLayoutEffect(() => {
        if (!wrapperRef.current || !textRef.current) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                textRef.current,
                {yPercent: 100},
                {
                    yPercent: 40,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: wrapperRef.current,
                        start: 'top 55%',
                        end: 'top 25%',
                        scrub: true,
                    },
                },
            );
        }, wrapperRef);

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="flex justify-center overflow-hidden px-8 py-7"
        >
            <p
                ref={textRef}
                className="select-none text-center text-[clamp(3rem,12vw,9.5rem)] font-bold leading-none tracking-tight text-primary/35 will-change-transform"
            >
                PAKFACTORY
            </p>
        </div>
    );
}
