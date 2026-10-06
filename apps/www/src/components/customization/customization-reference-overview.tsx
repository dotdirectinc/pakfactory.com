import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {cn} from '@pakfactory/ui/lib/utils';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_OVERVIEW_ID =
    'customization-reference-overview';

type CustomizationReferenceOverviewProps = {
    detail: CustomizationDetail;
    className?: string;
};

const benefitsBodyComponents: PortableTextComponents = {
    block: {
        normal: ({children}) => (
            <p className="mb-3 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </p>
        ),
    },
    list: {
        bullet: ({children}) => (
            <ul className="mb-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </ul>
        ),
        number: ({children}) => (
            <ol className="mb-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </ol>
        ),
    },
    listItem: {
        bullet: ({children}) => <li>{children}</li>,
        number: ({children}) => <li>{children}</li>,
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '#';
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

/**
 * Material / Finish Reference — Overview (PROD-1299).
 * Studio Benefits title + portable text body; optional hero media.
 */
export function CustomizationReferenceOverview({
    detail,
    className,
}: CustomizationReferenceOverviewProps) {
    const hero = detail.media.find((m) => Boolean(m.src));
    const title = detail.benefitsTitle?.trim();
    const body = detail.benefitsBody;
    const hasBenefits = Boolean(title || (body && body.length > 0));
    if (!hasBenefits) return null;

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
                    {title ? (
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">
                            {title}
                        </h3>
                    ) : null}
                    {body && body.length > 0 ? (
                        <div className="text-base">
                            <PortableText
                                value={body}
                                components={benefitsBodyComponents}
                            />
                        </div>
                    ) : null}
                </div>
                {hero?.src ? (
                    <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted">
                        <SanityImage
                            src={hero.src}
                            alt={hero.alt || detail.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 40vw"
                            className="object-cover"
                        />
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function hasReferenceOverview(detail: CustomizationDetail): boolean {
    return Boolean(
        detail.benefitsTitle?.trim() ||
            (detail.benefitsBody && detail.benefitsBody.length > 0),
    );
}
