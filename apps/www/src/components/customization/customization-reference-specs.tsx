import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_COMPARISON_ID} from '@/components/customization/customization-comparison';
import {Icon} from '@/components/ui/icon';
import {getReferenceSpecFixture} from '@/lib/catalog/reference-fixtures';
import type {
    CustomizationDetail,
    CustomizationPropertyValue,
} from '@/lib/catalog/types';

export const CUSTOMIZATION_REFERENCE_SPECS_ID =
    'customization-reference-specs';

export type ReferenceSpecRow = {
    label: string;
    value: string;
};

type CustomizationReferenceSpecsProps = {
    detail: CustomizationDetail;
    compareLabel: string;
    className?: string;
};

function groupKey(value: CustomizationPropertyValue): string | null {
    return value.propertySlug?.trim() || value.propertyId?.trim() || null;
}

/**
 * Spec rows from stated declared properties (Slice E), else slug fixture.
 */
export function buildReferenceSpecRows(
    detail: CustomizationDetail,
): ReferenceSpecRow[] {
    const statedKeys = new Set(
        detail.declaredProperties
            .filter((d) => d.usage === 'stated')
            .map((d) => d.propertySlug?.trim() || d.propertyId?.trim())
            .filter((k): k is string => Boolean(k)),
    );

    if (statedKeys.size > 0) {
        const groups = new Map<string, CustomizationPropertyValue[]>();
        for (const value of detail.properties) {
            const key = groupKey(value);
            if (!key || !statedKeys.has(key)) continue;
            const list = groups.get(key) ?? [];
            list.push(value);
            groups.set(key, list);
        }

        const rows: ReferenceSpecRow[] = [];
        for (const [key, values] of groups) {
            if (values.length === 0) continue;
            const declared = detail.declaredProperties.find(
                (d) =>
                    d.propertySlug === key || d.propertyId === key,
            );
            const label =
                declared?.propertyTitle?.trim() ||
                values.find((v) => v.propertyTitle)?.propertyTitle?.trim() ||
                key;
            const factDisplays = values.flatMap((v) =>
                v.facts.map((f) => f.display).filter(Boolean),
            );
            const titles = values.map((v) => v.title).filter(Boolean);
            const value =
                factDisplays.length > 0
                    ? factDisplays.join(' · ')
                    : titles.join(' · ');
            if (!value) continue;
            rows.push({label, value});
        }
        if (rows.length > 0) return rows;
    }

    return getReferenceSpecFixture(detail.slug);
}

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
