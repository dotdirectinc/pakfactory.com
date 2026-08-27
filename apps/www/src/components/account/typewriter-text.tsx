'use client';

import {useEffect, useState} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

type TypewriterTextProps = {
    text: string;
    /** Milliseconds between characters. */
    speed?: number;
    className?: string;
};

/**
 * Types `text` out one character at a time.
 *
 * The full string is always in the DOM behind `invisible`, so the line reserves
 * its final width up front and nothing around it shifts as the name grows. The
 * animated copy is aria-hidden and the wrapper carries the real text, otherwise
 * a screen reader would announce a half-typed name.
 */
export function TypewriterText({
    text,
    speed = 55,
    className,
}: TypewriterTextProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        setCount(0);

        const reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (reduced) {
            setCount(text.length);
            return;
        }

        const timer = setInterval(() => {
            setCount((current) => {
                if (current >= text.length) {
                    clearInterval(timer);
                    return current;
                }
                return current + 1;
            });
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    const done = count >= text.length;

    return (
        <span className={cn('relative inline-block', className)} aria-label={text}>
            <span className="invisible" aria-hidden>
                {text}
            </span>
            <span className="absolute inset-0 whitespace-pre" aria-hidden>
                {text.slice(0, count)}
                <span
                    className={cn(
                        'ml-0.5 inline-block w-px bg-current align-middle',
                        done ? 'opacity-0' : 'animate-pulse',
                    )}
                    style={{height: '1em'}}
                />
            </span>
        </span>
    );
}
