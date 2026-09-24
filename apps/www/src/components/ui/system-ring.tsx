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
                                : 'text-border',
                        )}
                    />
                ))}
                <foreignObject
                    x={SIZE / 2 - RADIUS + STROKE}
                    y={SIZE / 2 - RADIUS + STROKE}
                    width={(RADIUS - STROKE) * 2}
                    height={(RADIUS - STROKE) * 2}
                >
                    <div className="flex size-full items-center justify-center px-2 text-center text-xs font-semibold leading-tight text-foreground">
                        {name}
                    </div>
                </foreignObject>
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
