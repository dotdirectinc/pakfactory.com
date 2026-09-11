import {ACCOUNT_COPY} from '@/lib/copy/account';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {BuyerRequestLine} from '@/lib/account/buyer-requests';
import {productMediaLayerClass} from '@/lib/ui/product-media-scale';

export type AccountRequestProductCardProps = {
    line: BuyerRequestLine;
    /** First catalog media URL when resolved; omit for placeholder. */
    thumbSrc?: string | null;
};

function humanizeSlug(slug: string): string {
    return slug.replace(/-/g, ' ').trim();
}

function formatQuantityUnits(quantities: number[]): string {
    if (quantities.length === 0) return '';
    return (
        quantities.map((n) => n.toLocaleString('en-US')).join(', ') +
        ` ${REQUEST_COPY.unitsSuffix}`
    );
}

/**
 * Read-only mirror of ProductRequestCard chrome for account request detail.
 * No edit / customize / remove actions.
 */
export function AccountRequestProductCard({
    line,
    thumbSrc,
}: AccountRequestProductCardProps) {
    const title =
        line.title.trim() ||
        humanizeSlug(line.productSlug) ||
        line.productSlug;
    const qtyUnits = formatQuantityUnits(line.quantities);

    const specRows: {key: string; label: string; value: string}[] = [];
    if (line.contents.trim()) {
        specRows.push({
            key: 'contents',
            label: ACCOUNT_COPY.fieldContents,
            value: line.contents.trim(),
        });
    }
    if (line.customizations.length > 0) {
        specRows.push({
            key: 'customizations',
            label: ACCOUNT_COPY.fieldCustomizations,
            value: line.customizations.join(' · '),
        });
    }
    if (line.notes.trim()) {
        specRows.push({
            key: 'notes',
            label: ACCOUNT_COPY.fieldNotes,
            value: line.notes.trim(),
        });
    }

    return (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background sm:flex-row sm:items-stretch">
            <div className="mx-auto aspect-square w-[115px] max-h-[115px] shrink-0 self-start bg-background p-4 sm:mx-0">
                <div className="relative size-full overflow-hidden rounded-md bg-muted">
                    {thumbSrc ? (
                        // Catalog media URLs are static / CMS assets.
                        <div className={productMediaLayerClass}>
                            <img
                                src={thumbSrc}
                                alt=""
                                className="size-full object-contain"
                            />
                        </div>
                    ) : (
                        <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                        </span>
                    )}
                </div>
            </div>

            <div className="min-w-0 flex-1 p-4">
                <p className="text-base font-semibold tracking-tight text-foreground">
                    {title}
                </p>
                {line.productType || qtyUnits ? (
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                        {line.productType ? (
                            <span>{line.productType}</span>
                        ) : null}
                        {qtyUnits ? <span>{qtyUnits}</span> : null}
                    </div>
                ) : null}

                {specRows.length > 0 ? (
                    <dl className="mt-4 flex flex-col gap-1 text-sm">
                        {specRows.map((row) => (
                            <div
                                key={row.key}
                                className="flex flex-wrap gap-x-2"
                            >
                                <dt className="text-muted-foreground">
                                    {row.label}:
                                </dt>
                                <dd className="text-foreground">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                ) : null}
            </div>
        </div>
    );
}
