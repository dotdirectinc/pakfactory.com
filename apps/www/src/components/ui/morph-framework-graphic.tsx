'use client';

import type {MouseEvent} from 'react';
import {ArrowDown} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    bandPath,
    BOX,
    CARD_H,
    CARD_LEN,
    clamp01,
    DEPTH,
    lerp,
    NUMERALS_IN,
    numeralPos,
    phase,
    REST_X,
    REST_Y,
    SHAPE_MOVE,
    TEXT_OUT,
} from '@/lib/ui/morph-framework';

export type MorphLabel = {
    id: string;
    label: string;
    /** Index of the dimension (arc) this problem resolves to. */
    at: number;
};

type MorphFrameworkGraphicProps = {
    /** Scroll progress 0 (card stack) → 1 (settled dial). */
    t: number;
    /** Eased cursor offset, each axis in [-1, 1]. */
    par: {x: number; y: number};
    /** Problems sorted by `at`, so the stack reads 01–05 top to bottom. */
    labels: MorphLabel[];
    activeIndex: number;
    hoverIndex: number;
    onHover?: (index: number) => void;
    onResolve?: (event: MouseEvent, label: MorphLabel) => void;
    /** Large centre figure (e.g. "360°") and the line under it. */
    centerLabel: string;
    centerSub?: string;
    caption: string;
};

const numeral = (i: number) => String(i + 1).padStart(2, '0');

/**
 * The Signature system morph (PROD-2577, POC parity): five problem cards lose
 * their words, bend, turn and travel into the five arcs of the dial. Props-only;
 * the owning section drives `t` from scroll and `par` from the cursor.
 *
 * Three motions never run at once: cursor parallax (at rest, damped to nothing
 * as the ring forms) → text fade (t 0.02–0.28) → the shape morph (t 0.32–1).
 * The pains stay real buttons (HTML over the SVG) until they fade out.
 * `t = 1` with no handlers renders the finished dial (the static / mobile view).
 */
export function MorphFrameworkGraphic({
    t,
    par,
    labels,
    activeIndex,
    hoverIndex,
    onHover,
    onResolve,
    centerLabel,
    centerSub,
    caption,
}: MorphFrameworkGraphicProps) {
    const textOpacity = 1 - phase(t, TEXT_OUT);
    const shapeOpacity = phase(t, TEXT_OUT);
    const st = phase(t, SHAPE_MOVE);
    // The numeral belongs to the card: it leaves with the label and comes back
    // once there is a ring for it to sit beside.
    const numeralOpacity = Math.max(textOpacity, phase(st, NUMERALS_IN));
    const settled = clamp01((st - 0.5) / 0.5);
    // Before the ring exists the dark shape follows the pain being pointed at.
    const litIndex = st > 0.9 ? activeIndex : hoverIndex;
    const drift = 1 - st;
    const offset = (i: number) => ({
        dx: par.x * 6 * (DEPTH[i] ?? 0.5) * drift,
        dy: par.y * 4 * (DEPTH[i] ?? 0.5) * drift,
    });
    const interactive = Boolean(onResolve) && textOpacity >= 0.02;

    return (
        // One sticky element serves two heights: level with the copy at rest,
        // level with the first framework row once settled — it rides between.
        <div
            className="relative mx-auto w-full max-w-130"
            style={{transform: `translateY(${(1 - st) * 7}rem)`}}
        >
            <div className="relative w-full">
                <svg
                    viewBox={`0 0 ${BOX} ${BOX}`}
                    className="block w-full"
                    aria-hidden="true"
                >
                    <g opacity={shapeOpacity}>
                        {labels.map((l, i) => {
                            const {dx, dy} = offset(i);
                            return (
                                <path
                                    key={l.id}
                                    d={bandPath(
                                        st,
                                        i,
                                        l.at,
                                        dx,
                                        dy,
                                        lerp(CARD_H, l.at === activeIndex ? 14 : 4, st),
                                    )}
                                    className={cn(
                                        'transition-[fill] duration-500 ease-out motion-reduce:transition-none',
                                        l.at === litIndex ? 'fill-foreground' : 'fill-border',
                                    )}
                                />
                            );
                        })}
                    </g>
                </svg>

                {onResolve ? (
                    <ul
                        className="absolute inset-0"
                        style={{
                            opacity: textOpacity,
                            // Never leave an invisible focus target behind.
                            visibility: interactive ? undefined : 'hidden',
                        }}
                    >
                        {labels.map((l, i) => {
                            const {dx, dy} = offset(i);
                            return (
                                <li
                                    key={l.id}
                                    className="absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        left: `${(((REST_X[i] ?? 100) + dx) / BOX) * 100}%`,
                                        top: `${(((REST_Y[i] ?? 100) + dy) / BOX) * 100}%`,
                                        width: `${(CARD_LEN / BOX) * 100}%`,
                                        height: `${(CARD_H / BOX) * 100}%`,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={(event) => onResolve(event, l)}
                                        onPointerEnter={() => onHover?.(l.at)}
                                        onPointerLeave={() => onHover?.(-1)}
                                        onFocus={() => onHover?.(l.at)}
                                        onBlur={() => onHover?.(-1)}
                                        // Left padding clears the numeral (drawn in the SVG so it can travel).
                                        style={{paddingLeft: '17%'}}
                                        className="group pointer-events-auto flex size-full items-center gap-2 rounded-2xl border border-border bg-muted pr-2 text-left outline-none transition-colors duration-300 hover:border-foreground/25 hover:bg-border/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none"
                                    >
                                        <span className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground xl:text-sm">
                                            {l.label}
                                        </span>
                                        <span
                                            aria-hidden
                                            style={{height: '62%'}}
                                            className="grid aspect-square shrink-0 place-items-center rounded-full bg-background text-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background motion-reduce:transition-none"
                                        >
                                            <ArrowDown style={{width: '45%', height: '45%'}} />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                {/* Numerals ride above the cards on the same viewBox and never fade
                    out entirely: the number stays while its card dissolves, then
                    travels out to the ring. */}
                <svg
                    viewBox={`0 0 ${BOX} ${BOX}`}
                    className="pointer-events-none absolute inset-0 block w-full"
                    style={{opacity: numeralOpacity}}
                    aria-hidden="true"
                >
                    {labels.map((l, i) => {
                        const {dx, dy} = offset(i);
                        const p = numeralPos(st, i, l.at, dx, dy);
                        return (
                            <text
                                key={`n-${l.id}`}
                                x={p.x}
                                y={p.y}
                                fontSize={9}
                                textAnchor="middle"
                                dominantBaseline="central"
                                className={cn(
                                    'font-mono transition-colors duration-500 motion-reduce:transition-none',
                                    st < 0.5 || l.at === litIndex
                                        ? 'fill-foreground font-semibold'
                                        : 'fill-muted-foreground',
                                )}
                            >
                                {numeral(l.at)}
                            </text>
                        );
                    })}
                </svg>

                <div
                    style={{opacity: settled}}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center"
                >
                    <span className="text-3xl font-medium leading-none tracking-tight text-foreground xl:text-4xl">
                        {centerLabel}
                    </span>
                    {centerSub ? (
                        <span className="max-w-36 text-xs leading-5 text-muted-foreground">
                            {centerSub}
                        </span>
                    ) : null}
                </div>
            </div>
            <p
                aria-hidden="true"
                style={{opacity: settled}}
                className="mt-6 text-center text-xs text-muted-foreground"
            >
                {caption}
            </p>
        </div>
    );
}
