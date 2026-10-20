import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import type {CustomizationReferenceCopyVariant} from '@/components/customization/customization-reference-overview';
import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import {
    buildReferenceSpecRows,
    CUSTOMIZATION_COMPARISON_ID,
} from '@/lib/catalog/compare-matrix';
import {getLearnFirstSectionCopy} from '@/lib/catalog/reference-copy';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_SPECS_ID =
    'customization-reference-specs';

export {buildReferenceSpecRows, CUSTOMIZATION_COMPARISON_ID} from '@/lib/catalog/compare-matrix';
export type {ReferenceSpecRow} from '@/lib/catalog/compare-matrix';

type CustomizationReferenceSpecsContentProps = {
    detail: CustomizationDetail;
    compareLabel: string;
    className?: string;
    /**
     * `section` is the page title when this table is the only block.
     * `label` matches the benefits “why” title — Specs still belongs to Benefits.
     */
    heading?: 'section' | 'label';
    /** Learn-first uses Key properties; standard keeps Specs & performance. */
    copyVariant?: CustomizationReferenceCopyVariant;
};

/**
 * Spec rows. Always labeled so the table has an anchor.
 */
export function CustomizationReferenceSpecsContent({
    detail,
    compareLabel,
    className,
    heading = 'label',
    copyVariant = 'standard',
}: CustomizationReferenceSpecsContentProps) {
    const rows = buildReferenceSpecRows(detail);
    if (rows.length === 0) return null;

    const compareHref = `#${CUSTOMIZATION_COMPARISON_ID}`;
    const specsTitle =
        copyVariant === 'learnFirst'
            ? getLearnFirstSectionCopy(detail).specsLabel
            : 'Specs & performance';

    return (
        <div
            id={CUSTOMIZATION_REFERENCE_SPECS_ID}
            className={cn('scroll-mt-32', className)}
        >
            {heading === 'section' ? (
                <SectionHeading
                    title={specsTitle}
                    className="[&>div]:md:max-w-none"
                />
            ) : (
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                    {specsTitle}
                </h3>
            )}

            <dl
                className={cn(
                    'border-t border-border',
                    heading === 'section' ? 'mt-12' : 'mt-8',
                )}
            >
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="grid grid-cols-[40%_1fr] items-baseline gap-4 border-b border-border py-4"
                    >
                        <dt className="text-sm text-muted-foreground">
                            {row.label}
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-semibold text-foreground">
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="mt-8">
                <Button
                    asChild
                    variant="link"
                    className="h-auto gap-2 px-0 has-[>svg]:px-0"
                >
                    <InPageAnchorLink href={compareHref}>
                        {compareLabel}
                        <Icon icon={ChevronDown} size="sm" />
                    </InPageAnchorLink>
                </Button>
            </div>
        </div>
    );
}

export function hasReferenceSpecs(detail: CustomizationDetail): boolean {
    return buildReferenceSpecRows(detail).length > 0;
}
