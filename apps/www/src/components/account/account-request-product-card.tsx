import {RequestProductCard} from '@pakfactory/brief-builder-ui/request-product-card';
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

function formatQuantityList(quantities: number[]): string {
    return quantities.map((n) => n.toLocaleString('en-US')).join(', ');
}

/**
 * Read-only account controller over shared RequestProductCard chrome.
 */
export function AccountRequestProductCard({
    line,
    thumbSrc,
}: AccountRequestProductCardProps) {
    const title =
        line.title.trim() ||
        humanizeSlug(line.productSlug) ||
        line.productSlug;
    const qtyList = formatQuantityList(line.quantities);

    const notesItems: {key: string; label: string; value: string}[] = [];
    if (line.contents.trim()) {
        notesItems.push({
            key: 'contents',
            label: ACCOUNT_COPY.fieldContents,
            value: line.contents.trim(),
        });
    }
    if (line.notes.trim()) {
        notesItems.push({
            key: 'notes',
            label: ACCOUNT_COPY.fieldNotes,
            value: line.notes.trim(),
        });
    }

    return (
        <RequestProductCard
            title={title}
            eyebrow={line.productType || undefined}
            thumbSrc={thumbSrc}
            thumbInnerClassName={productMediaLayerClass}
            detailRows={[
                {
                    key: 'quantity',
                    label: REQUEST_COPY.quantityLabel,
                    children: qtyList ? (
                        <>
                            {qtyList} {REQUEST_COPY.unitsSuffix}
                        </>
                    ) : (
                        <span className="text-muted-foreground">
                            {REQUEST_COPY.notAdded}
                        </span>
                    ),
                },
                {
                    key: 'customization',
                    label: REQUEST_COPY.customizationRowLabel,
                    children:
                        line.customizations.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                                {line.customizations.map((label) => (
                                    <li key={label}>
                                        <span className="font-medium text-foreground">
                                            {label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-muted-foreground">
                                {REQUEST_COPY.notAdded}
                            </span>
                        ),
                },
                {
                    key: 'notes',
                    label: REQUEST_COPY.notesAndImageRowLabel,
                    children:
                        notesItems.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                                {notesItems.map((row) => (
                                    <li key={row.key}>
                                        <span className="text-muted-foreground">
                                            {row.label}:{' '}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {row.value}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-muted-foreground">
                                {REQUEST_COPY.notAdded}
                            </span>
                        ),
                },
            ]}
        />
    );
}
