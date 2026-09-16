import {CircleDot} from 'lucide-react';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import type {ProductSpecRow} from '@/components/product/build-product-spec-rows';
import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';

type ProductSpecsProps = {
    heading?: string;
    description?: string;
    rows: ProductSpecRow[];
    className?: string;
};

/**
 * Product-bound specs table (POC ProductSpecificationsSection / V5 mock).
 * Not a free-form Sanity section — derived from catalog facts.
 */
export function ProductSpecs({
    heading = 'The details',
    description = 'Fixed properties of this style: size, material, and finishing are confirmed with a specialist on quote.',
    rows,
    className,
}: ProductSpecsProps) {
    if (rows.length === 0) return null;

    return (
        <section id="pdp-specs" className={cn('scroll-mt-20', className)}>
            <PageDielineSection innerClassName="border-b border-dashed border-border pt-16 pb-0 sm:pt-20">
                <SectionHeading
                    eyebrow="Specifications"
                    title={heading}
                    description={description}
                    descriptionClassName="text-base leading-6"
                />

                <div className="-mx-layout-gutter-inner mt-16">
                    <table className="w-full border-collapse border-t border-dashed border-border">
                        <tbody>
                            {rows.map((row) => {
                                const Glyph = row.icon ?? CircleDot;
                                return (
                                    <tr
                                        key={row.label}
                                        className="border-b border-dashed border-border last:border-b-0"
                                    >
                                        <th
                                            scope="row"
                                            className="block w-full p-0 text-left font-normal sm:table-cell sm:w-[38%] sm:align-middle lg:w-[35%]"
                                        >
                                            <div className="flex items-center gap-4 py-6 pl-layout-gutter-inner pr-6">
                                                <span
                                                    aria-hidden
                                                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground lg:size-11"
                                                >
                                                    <Icon
                                                        icon={Glyph}
                                                        size="md"
                                                        className="text-background"
                                                        strokeWidth={2}
                                                    />
                                                </span>
                                                <span className="text-base font-semibold leading-none text-brand-blue lg:text-lg">
                                                    {row.label}
                                                </span>
                                            </div>
                                        </th>
                                        <td className="block w-full bg-muted/50 p-0 sm:table-cell sm:align-middle">
                                            <p className="flex min-h-10 items-center py-6 pl-6 pr-layout-gutter-inner text-sm leading-none text-foreground sm:min-h-11 sm:pl-8 lg:text-base">
                                                {row.value}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </PageDielineSection>
        </section>
    );
}
