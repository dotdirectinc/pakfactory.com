import {cn} from '@pakfactory/ui/lib/utils';

type SystemRingProps = {
    /** Named method shown in the centre (e.g. "360° Strategic Framework"). */
    name: string;
    /** Number of segments — one per dimension. */
    count: number;
    /** Highlighted segment; -1 for none. */
    activeIndex: number;
    /** Caption under the ring for the highlighted segment. */
    activeLabel?: string;
    className?: string;
};

const SIZE = 200;
const RADIUS = 80;
const STROKE = 12;
const GAP = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Stage numbers sit just outside the ring (viewBox units). */
const LABEL_RADIUS = 95;
/** Type sizes in viewBox units — they scale with the ring, like the strokes. */
const LABEL_FONT_SIZE = 8;
const LEAD_FONT_SIZE = 28;
const REST_FONT_SIZE = 8;

/**
 * "360° Strategic Framework" → lead "360°" + rest "Strategic Framework": a
 * leading figure is set large, the way the method is spoken. Names without a
 * leading figure render whole.
 */
function splitName(name: string): {lead?: string; rest: string} {
    const match = name.trim().match(/^(\S*\d\S*)\s+(.+)$/);
    return match ? {lead: match[1], rest: match[2] as string} : {rest: name};
}

/**
 * Decorative segmented ring — one arc per dimension, the active one in the
 * foreground colour. Props-only, no interaction (the owning section's list is
 * the control), hidden from assistive tech; the caption repeats the state as text.
 */
export function SystemRing({
    name,
    count,
    activeIndex,
    activeLabel,
    className,
}: SystemRingProps) {
    if (count <= 0) return null;

    const segment = CIRCUMFERENCE / count;
    const {lead, rest} = splitName(name);
    const arc = Math.max(segment - GAP, 1);

    return (
        <figure className={cn('flex flex-col items-center gap-4', className)}>
            <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="aspect-square w-full"
                aria-hidden
            >
                {Array.from({length: count}, (_, index) => (
                    <circle
                        key={index}
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={STROKE}
                        strokeDasharray={`${arc} ${CIRCUMFERENCE - arc}`}
                        strokeDashoffset={-(segment * index) + GAP / 2}
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                        className={cn(
                            'transition-colors duration-300',
                            index === activeIndex
                                ? 'text-foreground'
                                : 'text-foreground/15',
                        )}
                    />
                ))}
                {Array.from({length: count}, (_, index) => {
                    // Number at the arc's midpoint, just outside the ring.
                    const angle = ((index + 0.5) / count) * 2 * Math.PI;
                    return (
                        <text
                            key={`label-${index}`}
                            x={SIZE / 2 + LABEL_RADIUS * Math.sin(angle)}
                            y={SIZE / 2 - LABEL_RADIUS * Math.cos(angle)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="currentColor"
                            fontSize={LABEL_FONT_SIZE}
                            className={cn(
                                'font-mono transition-colors duration-300',
                                index === activeIndex
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {String(index + 1).padStart(2, '0')}
                        </text>
                    );
                })}
                {lead ? (
                    <text
                        x={SIZE / 2}
                        y={SIZE / 2}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-foreground"
                    >
                        <tspan
                            x={SIZE / 2}
                            dy="-0.1em"
                            fontSize={LEAD_FONT_SIZE}
                            fontWeight={600}
                        >
                            {lead}
                        </tspan>
                        <tspan
                            x={SIZE / 2}
                            dy={LEAD_FONT_SIZE * 0.75}
                            fontSize={REST_FONT_SIZE}
                            className="text-muted-foreground"
                            fill="currentColor"
                        >
                            {rest}
                        </tspan>
                    </text>
                ) : (
                    <foreignObject
                        x={SIZE / 2 - RADIUS + STROKE}
                        y={SIZE / 2 - RADIUS + STROKE}
                        width={(RADIUS - STROKE) * 2}
                        height={(RADIUS - STROKE) * 2}
                    >
                        <div className="flex size-full items-center justify-center px-2 text-center text-xs font-semibold leading-tight text-foreground">
                            {rest}
                        </div>
                    </foreignObject>
                )}
            </svg>
            {activeLabel ? (
                <figcaption
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                >
                    {activeLabel}
                </figcaption>
            ) : null}
        </figure>
    );
}
