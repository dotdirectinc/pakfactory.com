import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type CarouselNavButtonsProps = {
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
    prevLabel?: string;
    nextLabel?: string;
    className?: string;
};

function navButtonClass(enabled: boolean) {
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
 */
export function CarouselNavButtons({
    onPrev,
    onNext,
    canPrev,
    canNext,
    prevLabel = 'Previous',
    nextLabel = 'Next',
    className,
}: CarouselNavButtonsProps) {
    return (
        <div className={cn('flex shrink-0 items-center gap-2', className)}>
            <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={onPrev}
                disabled={!canPrev}
                className={navButtonClass(canPrev)}
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
                className={navButtonClass(canNext)}
                aria-label={nextLabel}
            >
                <Icon icon={ChevronRight} size="sm" />
            </Button>
        </div>
    );
}
