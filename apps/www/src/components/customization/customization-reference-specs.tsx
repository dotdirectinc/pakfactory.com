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

type CustomizationReferenceSpecsProps = {
    detail: CustomizationDetail;
    compareLabel: string;
    className?: string;
};

/**
 * Material Reference — Specs & performance subsection (PROD-1299).
 * Content-only; parent band owns the dieline shell.
 */
export function CustomizationReferenceSpecs({
    detail,
    compareLabel,
    className,
}: CustomizationReferenceSpecsProps) {
    const rows = buildReferenceSpecRows(detail);
    if (rows.length === 0) return null;

    const compareHref = `#${CUSTOMIZATION_COMPARISON_ID}`;

    return (
        <section
            id={CUSTOMIZATION_REFERENCE_SPECS_ID}
            className={cn(
                'scroll-mt-32 border-b border-dashed border-border py-16 sm:py-20',
                className,
            )}
        >
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Specs &amp; performance
            </h3>

            <div className="mt-8 border-t border-dashed border-border">
                <dl>
                    {rows.map((row) => (
                        <div
                            key={row.label}
                            className="flex flex-col gap-1 border-b border-dashed border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                        >
                            <dt className="shrink-0 text-sm text-muted-foreground">
                                {row.label}
                            </dt>
                            <dd className="min-w-0 text-sm font-semibold text-foreground sm:text-right">
                                {row.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="mt-8">
                <Button
                    asChild
                    variant="outline"
                    className="h-auto gap-2 rounded-full px-6 py-3 text-base shadow-none"
                >
                    <Link href={compareHref}>
                        {compareLabel}
                        <Icon icon={ChevronDown} size="sm" />
                    </Link>
                </Button>
            </div>
        </section>
    );
}

export function hasReferenceSpecs(detail: CustomizationDetail): boolean {
    return buildReferenceSpecRows(detail).length > 0;
}
