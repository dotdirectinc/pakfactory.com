import {Star} from 'lucide-react';

import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type StarRatingProps = {
    /** 0–5; fractional values (e.g. 4.8) render a partial final star. */
    value: number;
    className?: string;
    size?: 'sm' | 'md';
};

/**
 * Display-only 5-star rating. Supports half fills for aggregate scores.
 */
export function StarRating({value, className, size = 'sm'}: StarRatingProps) {
    const clamped = Math.min(5, Math.max(0, value));
    const iconSize = size === 'md' ? 'md' : 'sm';

    return (
        <div
            className={cn('flex items-center gap-1', className)}
            role="img"
            aria-label={`${clamped.toFixed(1)} out of 5 stars`}
        >
            {Array.from({length: 5}, (_, index) => {
                const fill = Math.min(1, Math.max(0, clamped - index));
                return (
                    <span key={index} className="relative inline-flex shrink-0">
                        <Icon
                            icon={Star}
                            size={iconSize}
                            className="text-muted-foreground/30"
                            strokeWidth={1.5}
                        />
                        {fill > 0 ? (
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{width: `${fill * 100}%`}}
                            >
                                <Icon
                                    icon={Star}
                                    size={iconSize}
                                    className="fill-foreground text-foreground"
                                    strokeWidth={1.5}
                                />
                            </span>
                        ) : null}
                    </span>
                );
            })}
        </div>
    );
}
