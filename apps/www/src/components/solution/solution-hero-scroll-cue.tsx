'use client';

import {useEffect, useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

export const HERO_SECTION_ID = 'solution-hero';

/** Delay before fade+rise entrance (Option A). */
const ENTRANCE_DELAY_MS = 500;

type SolutionHeroScrollCueProps = {
    label: string;
};

/**
 * Fixed bottom-of-viewport primary Button — scroll cue past the hero.
 * Enters with a delayed fade + rise (skipped when reduced motion).
 */
export function SolutionHeroScrollCue({label}: SolutionHeroScrollCueProps) {
    const [heroInView, setHeroInView] = useState(true);
    const [entered, setEntered] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncMotion = () => setReduceMotion(mq.matches);
        syncMotion();
        mq.addEventListener('change', syncMotion);

        const hero = document.getElementById(HERO_SECTION_ID);
        if (!hero) {
            return () => mq.removeEventListener('change', syncMotion);
        }

        // Hide as the hero scrolls up and out of the viewport (user scrolls down).
        const syncVisibility = () => {
            const {bottom} = hero.getBoundingClientRect();
            setHeroInView(bottom > window.innerHeight * 0.45);
        };
        syncVisibility();
        window.addEventListener('scroll', syncVisibility, {passive: true});
        window.addEventListener('resize', syncVisibility);

        return () => {
            mq.removeEventListener('change', syncMotion);
            window.removeEventListener('scroll', syncVisibility);
            window.removeEventListener('resize', syncVisibility);
        };
    }, []);

    useEffect(() => {
        if (reduceMotion) {
            setEntered(true);
            return;
        }

        setEntered(false);
        const timer = window.setTimeout(() => {
            setEntered(true);
        }, ENTRANCE_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [reduceMotion]);

    const visible = entered && heroInView;

    function handleClick() {
        const hero = document.getElementById(HERO_SECTION_ID);
        const next = hero?.nextElementSibling;
        const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

        if (next instanceof HTMLElement) {
            next.scrollIntoView({behavior, block: 'start'});
            return;
        }
        window.scrollBy({
            top: window.innerHeight * 0.75,
            behavior,
        });
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-12 z-40 flex justify-center">
            <Button
                type="button"
                variant="default"
                size="xl"
                onClick={handleClick}
                aria-hidden={!visible}
                tabIndex={visible ? 0 : -1}
                className={cn(
                    'pointer-events-auto h-auto gap-3 rounded-full py-3 pr-3 pl-8 text-lg shadow-md',
                    !reduceMotion &&
                        'transition-[opacity,translate] duration-[var(--motion-base)] ease-out',
                    visible
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-2 opacity-0',
                    reduceMotion && !heroInView && 'translate-y-0',
                )}
            >
                {label}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
                    <Icon icon={ChevronDown} size="sm" />
                </span>
            </Button>
        </div>
    );
}
