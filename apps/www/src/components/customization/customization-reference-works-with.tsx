import Link from 'next/link';
import {cn} from '@pakfactory/ui/lib/utils';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {productHref} from '@/lib/www-routes';

export const CUSTOMIZATION_REFERENCE_WORKS_WITH_ID =
    'customization-reference-works-with';

type CustomizationReferenceWorksWithProps = {
    detail: CustomizationDetail;
    className?: string;
};

/**
 * Material Reference — Works with subsection (PROD-1299).
 * Content-only; parent band owns the dieline shell.
 * Product lines from `availableOnProducts`; muted empty when none.
 */
export function CustomizationReferenceWorksWith({
    detail,
    className,
}: CustomizationReferenceWorksWithProps) {
    const lines = detail.productLines;

    return (
        <section
            id={CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}
            className={cn('scroll-mt-32 py-16 sm:py-20', className)}
        >
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Works with
            </h3>

            {lines.length > 0 ? (
                <ul className="mt-8 flex flex-wrap gap-2">
                    {lines.map((line) => (
                        <li key={line.slug}>
                            <Link
                                href={productHref(line.slug)}
                                className="inline-flex rounded-control border border-border bg-card px-4 py-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {line.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-8 text-sm text-muted-foreground">
                    Product-line availability for this option has not been
                    authored yet.
                </p>
            )}
        </section>
    );
}

/** Always present so the in-band nav can include Works with. */
export function hasReferenceWorksWith(): boolean {
    return true;
}
