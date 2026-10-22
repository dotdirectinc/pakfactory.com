import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type CarouselNavTone = 'default' | 'onDark';

type CarouselNavButtonsProps = {
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
    prevLabel?: string;
    nextLabel?: string;
    className?: string;
    /** `onDark` — white circles on a dark overlay (lightbox). */
    tone?: CarouselNavTone;
};

function navButtonClass(enabled: boolean, tone: CarouselNavTone) {
    if (tone === 'onDark') {
        return cn(
            'rounded-full text-foreground hover:text-foreground',
            enabled
                ? 'bg-white hover:bg-white/90'
                : 'bg-white/40 hover:bg-white/40',
        );
    }
    return cn(
        'rounded-full text-background',
        'hover:text-background',
        enabled
            ? 'bg-foreground hover:bg-foreground hover:opacity-90'
            : 'bg-muted-foreground/40 hover:bg-muted-foreground/40',
    );
}

/**
 * Circular prev/next pair for section carousels (ProductsRow, TestimonialsRow).
 * Enabled = black fill; disabled = muted grey circle (design-system).
 * `tone="onDark"` inverts to white fill on a dark overlay.
 */
export function CarouselNavButtons({
    onPrev,
    onNext,
    canPrev,
    canNext,
    prevLabel = 'Previous',
    nextLabel = 'Next',
    className,
    tone = 'default',
}: CarouselNavButtonsProps) {
    return (
        <div className={cn('flex shrink-0 items-center gap-2', className)}>
            <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={onPrev}
                disabled={!canPrev}
                className={navButtonClass(canPrev, tone)}
                aria-label={prevLabel}
            >
                <Icon icon={ChevronLeft} size="sm" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={onNext}
                disabled={!canNext}
                className={navButtonClass(canNext, tone)}
                aria-label={nextLabel}
            >
                <Icon icon={ChevronRight} size="sm" />
            </Button>
        </div>
    );
}
