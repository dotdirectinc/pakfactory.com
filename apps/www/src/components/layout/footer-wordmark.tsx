'use client';

import {useLayoutEffect, useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Giant PAKFACTORY mark — slides up on scroll and settles still clipped (peek).
 *  Dotted grid is owned by SiteFooter’s meta+wordmark section wrapper. */
export function FooterWordmark() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !textRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(textRef.current, {yPercent: 40});
      return;
    }

    // Hidden below the clip until the footer scrolls into view.
    gsap.set(textRef.current, {yPercent: 100});

    const ctx = gsap.context(() => {
      gsap.fromTo(
        textRef.current,
        {yPercent: 100},
        {
          yPercent: 40,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top bottom',
            end: 'top 100%',
            scrub: 1,
          },
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative z-10 w-full overflow-hidden py-4 md:py-5"
      aria-hidden="true"
    >
      <p
        ref={textRef}
        className="mx-auto w-full select-none text-center text-[clamp(4rem,15vw,15rem)] font-black leading-none tracking-tight text-primary will-change-transform"
      >
        PAKFACTORY
      </p>
    </div>
  );
}
