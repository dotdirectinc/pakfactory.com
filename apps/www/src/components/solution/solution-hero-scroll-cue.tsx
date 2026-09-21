'use client';

import {useEffect, useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

export const HERO_SECTION_ID = 'solution-hero';

type SolutionHeroScrollCueProps = {
    label: string;
};

/**
 * Fixed bottom-of-viewport primary Button — scroll cue past the hero.
 */
export function SolutionHeroScrollCue({label}: SolutionHeroScrollCueProps) {
    const [visible, setVisible] = useState(true);
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
            setVisible(bottom > window.innerHeight * 0.45);
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
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
            <Button
                type="button"
                variant="default"
                size="xl"
                onClick={handleClick}
                aria-hidden={!visible}
                tabIndex={visible ? 0 : -1}
                className={cn(
                    'pointer-events-auto gap-3 rounded-full py-2 pr-2 pl-6 shadow-md',
                    !reduceMotion &&
                        'transition-opacity duration-[var(--motion-base)]',
                    visible
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
            >
                {label}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
                    <Icon icon={ChevronDown} size="sm" />
                </span>
            </Button>
        </div>
    );
}

export {HERO_SECTION_ID};
