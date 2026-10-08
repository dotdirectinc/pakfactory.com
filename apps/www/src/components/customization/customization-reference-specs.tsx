import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';
import {
    buildReferenceSpecRows,
    CUSTOMIZATION_COMPARISON_ID,
} from '@/lib/catalog/compare-matrix';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_SPECS_ID =
    'customization-reference-specs';

export {buildReferenceSpecRows, CUSTOMIZATION_COMPARISON_ID} from '@/lib/catalog/compare-matrix';
export type {ReferenceSpecRow} from '@/lib/catalog/compare-matrix';

type CustomizationReferenceSpecsContentProps = {
    detail: CustomizationDetail;
    compareLabel: string;
    className?: string;
};

/**
 * Specs & performance content block (PROD-1299) — used inside the shared
 * Benefits/Specs band. Keeps the scroll anchor for AnchorNav.
 */
export function CustomizationReferenceSpecsContent({
    detail,
    compareLabel,
    className,
}: CustomizationReferenceSpecsContentProps) {
    const rows = buildReferenceSpecRows(detail);
    if (rows.length === 0) return null;

    const compareHref = `#${CUSTOMIZATION_COMPARISON_ID}`;

    return (
        <div
            id={CUSTOMIZATION_REFERENCE_SPECS_ID}
            className={cn('scroll-mt-32', className)}
        >
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Specs &amp; performance
            </h3>

            <dl className="mt-8 border-t border-border">
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
                    <Link href={compareHref}>
                        {compareLabel}
                        <Icon icon={ChevronDown} size="sm" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export function hasReferenceSpecs(detail: CustomizationDetail): boolean {
    return buildReferenceSpecRows(detail).length > 0;
}
