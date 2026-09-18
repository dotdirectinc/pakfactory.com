import {cn} from '@pakfactory/ui/lib/utils';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_OVERVIEW_ID =
    'customization-reference-overview';

type CustomizationReferenceOverviewProps = {
    detail: CustomizationDetail;
    className?: string;
};

/**
 * Material Reference — Overview subsection (PROD-1299).
 * Sanity Option description + media only (no fixture features).
 */
export function CustomizationReferenceOverview({
    detail,
    className,
}: CustomizationReferenceOverviewProps) {
    const hero = detail.media.find((m) => Boolean(m.src));
    const body = detail.description?.trim();
    const hasContent = Boolean(body || hero?.src);
    if (!hasContent) return null;

    return (
        <section
            id={CUSTOMIZATION_REFERENCE_OVERVIEW_ID}
            className={cn(
                'scroll-mt-32 border-b border-dashed border-border py-16 sm:py-20',
                className,
            )}
        >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex flex-col gap-4">
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                        What is {detail.title}?
                    </h3>
                    {body ? (
                        <p className="text-base leading-relaxed text-muted-foreground">
                            {body}
                        </p>
                    ) : null}
                </div>
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted">
                    {hero?.src ? (
                        <SanityImage
                            src={hero.src}
                            alt={hero.alt || detail.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 40vw"
                            className="object-cover"
                        />
                    ) : null}
                </div>
            </div>
        </section>
    );
}

export function hasReferenceOverview(detail: CustomizationDetail): boolean {
    const hero = detail.media.some((m) => Boolean(m.src));
    return Boolean(detail.description?.trim() || hero);
}
