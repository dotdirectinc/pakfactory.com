import {Check} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {getReferenceFeatures} from '@/lib/catalog/reference-fixtures';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_OVERVIEW_ID =
    'customization-reference-overview';

type CustomizationReferenceOverviewProps = {
    detail: CustomizationDetail;
    className?: string;
};

/**
 * Material Reference — Overview subsection (PROD-1299).
 * Content-only; parent band owns the dieline shell.
 */
export function CustomizationReferenceOverview({
    detail,
    className,
}: CustomizationReferenceOverviewProps) {
    const features = getReferenceFeatures(detail.slug);
    const hero = detail.media.find((m) => Boolean(m.src));
    const body = detail.description?.trim();
    const hasContent = Boolean(body || hero?.src || features.length > 0);
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

            {features.length > 0 ? (
                <ul className="mt-12 grid gap-6 sm:grid-cols-2">
                    {features.map((feature) => (
                        <li
                            key={feature.title}
                            className="flex gap-3 rounded-control border border-border bg-card p-4"
                        >
                            <span
                                aria-hidden
                                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            >
                                <Icon
                                    icon={Check}
                                    size="sm"
                                    className="size-3"
                                    strokeWidth={2.5}
                                />
                            </span>
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="text-sm font-semibold tracking-tight text-foreground">
                                    {feature.title}
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}

export function hasReferenceOverview(detail: CustomizationDetail): boolean {
    const features = getReferenceFeatures(detail.slug);
    const hero = detail.media.some((m) => Boolean(m.src));
    return Boolean(detail.description?.trim() || hero || features.length > 0);
}
