import {cn} from '@pakfactory/ui/lib/utils';

import {StarRating} from '@/components/ui/star-rating';
import {TestimonialSourceMark} from '@/components/ui/testimonial-source-mark';
import type {ProductTestimonial} from '@/lib/catalog/types';

/** Word-aware quote cap before “Read more” (Google review URL). */
export const TESTIMONIAL_QUOTE_MAX_CHARS = 160;

type TestimonialCardProps = {
    item: ProductTestimonial;
    className?: string;
};

function truncateQuote(quote: string, maxChars: number): {
    text: string;
    truncated: boolean;
} {
    const trimmed = quote.trim();
    if (trimmed.length <= maxChars) {
        return {text: trimmed, truncated: false};
    }

    const slice = trimmed.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(' ');
    const cut =
        lastSpace > Math.floor(maxChars * 0.6) ? slice.slice(0, lastSpace) : slice;

    return {text: `${cut.trimEnd()}…`, truncated: true};
}

/**
 * Props-only review card for TestimonialsRow (ADR-013).
 * Google variant: optional avatar + author profile link (attribution policy).
 * Long quotes truncate with Read more → individual Google review URL.
 */
export function TestimonialCard({item, className}: TestimonialCardProps) {
    const positives = item.positives ?? [];
    const positivesLine =
        positives.length > 0 ? `Positive: ${positives.join(', ')}` : null;

    const {text: quoteText, truncated} = truncateQuote(
        item.quote,
        TESTIMONIAL_QUOTE_MAX_CHARS,
    );

    const name = (
        <h3 className="text-base font-semibold text-foreground">
            {item.authorProfileUrl ? (
                <a
                    href={item.authorProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:underline"
                >
                    {item.attributionName}
                </a>
            ) : (
                item.attributionName
            )}
        </h3>
    );

    return (
        <article
            className={cn(
                'flex h-full flex-col gap-4 rounded-xl bg-muted p-6 sm:p-8',
                className,
            )}
        >
            <div className="flex flex-col gap-2">
                <StarRating value={item.rating} />
                <div className="flex items-center gap-2">
                    {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Google author photoUri; avoid next/image remote config for third-party avatars
                        <img
                            src={item.avatarUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    ) : null}
                    {name}
                </div>
                {positivesLine ? (
                    <p className="text-sm text-muted-foreground">
                        {positivesLine}
                    </p>
                ) : null}
            </div>

            <div className="border-t border-border" />

            <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm leading-relaxed text-foreground">
                    {quoteText}
                </p>
                {truncated && item.reviewUrl ? (
                    <a
                        href={item.reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        Read more
                    </a>
                ) : null}
            </div>

            <TestimonialSourceMark source={item.source} />
        </article>
    );
}
