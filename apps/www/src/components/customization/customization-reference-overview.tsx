import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {cn} from '@pakfactory/ui/lib/utils';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {SectionHeading} from '@/components/ui/section-heading';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_OVERVIEW_ID =
    'customization-reference-overview';

type CustomizationReferenceBenefitsContentProps = {
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
 * Benefits content block (PROD-1299) — used inside the shared Benefits/Specs band.
 * Hierarchy: SectionHeading Benefits (h2) → benefitsTitle (h3) → body.
 */
export function CustomizationReferenceBenefitsContent({
    detail,
    className,
}: CustomizationReferenceBenefitsContentProps) {
    const benefitsTitle = detail.benefitsTitle?.trim() || '';
    const body = detail.benefitsBody;
    if (!hasReferenceOverview(detail)) return null;

    return (
        <div
            id={CUSTOMIZATION_REFERENCE_OVERVIEW_ID}
            className={cn('scroll-mt-32', className)}
        >
            <SectionHeading
                title="Benefits"
                className="[&>div]:md:max-w-none"
            />
            <div className="mt-12 flex min-w-0 flex-col gap-6">
                {benefitsTitle ? (
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                        {benefitsTitle}
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
        </div>
    );
}

export function hasReferenceOverview(detail: CustomizationDetail): boolean {
    return Boolean(
        detail.benefitsTitle?.trim() ||
            (detail.benefitsBody && detail.benefitsBody.length > 0),
    );
}
