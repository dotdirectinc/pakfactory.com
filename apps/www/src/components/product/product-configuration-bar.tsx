'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Input} from '@pakfactory/ui/components/input';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {
    useProductPdpDraft,
    type MissingRequestField,
} from '@/components/product/product-pdp-draft';
import {REQUEST_COPY} from '@/lib/copy/request';

export function ProductConfigurationBar() {
    const {
        product,
        volumes,
        contents,
        ready,
        showStickyBar,
        missingForRequest,
        summaryParts,
        addVolume,
        removeVolume,
        setContents,
        resetDraft,
        handleAdd,
    } = useProductPdpDraft();
    const [fillModal, setFillModal] = useState<MissingRequestField | null>(null);

    if (!showStickyBar) return null;

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="mx-auto flex w-full max-w-[1760px] items-center gap-4 px-6 py-3 sm:px-8">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
                            {REQUEST_COPY.yourConfiguration}
                        </p>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold tracking-tight text-foreground">
                            {summaryParts.map((part, index) => (
                                <span
                                    key={`${part}-${index}`}
                                    className="inline-flex min-w-0 items-center"
                                >
                                    {index > 0 ? (
                                        <span className="mr-2 font-normal text-muted-foreground">
                                            ·
                                        </span>
                                    ) : null}
                                    <span className="truncate">{part}</span>
                                </span>
                            ))}
                            {missingForRequest.map((key, index) => (
                                <span
                                    key={key}
                                    className="inline-flex items-center gap-2"
                                >
                                    {summaryParts.length > 0 || index > 0 ? (
                                        <span className="font-normal text-muted-foreground">
                                            ·
                                        </span>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-xs font-medium"
                                        onClick={() => setFillModal(key)}
                                    >
                                        {key === 'quantity'
                                            ? REQUEST_COPY.quantityLabel
                                            : REQUEST_COPY.contentsChip}
                                    </Button>
                                </span>
                            ))}
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-auto shrink-0 px-4 py-3 text-[15px] font-medium text-muted-foreground hover:text-foreground"
                        onClick={resetDraft}
                    >
                        {REQUEST_COPY.clear}
                    </Button>
                    <Button
                        type="button"
                        disabled={!ready}
                        className="h-auto shrink-0 px-8 py-3 text-[15px] font-medium"
                        onClick={handleAdd}
                    >
                        {REQUEST_COPY.addToRequest}
                    </Button>
                </div>
            </div>

            <Dialog
                open={fillModal != null}
                onOpenChange={(open) => {
                    if (!open) setFillModal(null);
                }}
            >
                <DialogContent className="gap-0 p-0 sm:max-w-lg">
                    <DialogHeader className="border-b border-border px-5 py-4">
                        <DialogTitle>
                            {fillModal === 'quantity'
                                ? REQUEST_COPY.quantityLabel
                                : REQUEST_COPY.contentsLabel}
                        </DialogTitle>
                        <DialogDescription>
                            {fillModal === 'quantity'
                                ? REQUEST_COPY.quantityFillHelp
                                : REQUEST_COPY.contentsHelp}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 px-5 py-4">
                        {fillModal === 'quantity' ? (
                            <QuantityPicker
                                volumes={volumes}
                                onAdd={addVolume}
                                onRemove={removeVolume}
                                moq={product.moq ?? 500}
                                unitLabel={REQUEST_COPY.unitsSuffix}
                            />
                        ) : null}
                        {fillModal === 'contents' ? (
                            <Input
                                className="h-11"
                                placeholder={REQUEST_COPY.contentsPlaceholder}
                                value={contents}
                                onChange={(event) =>
                                    setContents(event.target.value)
                                }
                                autoFocus
                            />
                        ) : null}
                    </div>
                    <DialogFooter className="border-t border-border px-5 py-3 sm:justify-end">
                        <Button
                            type="button"
                            className="h-10 px-5"
                            onClick={() => setFillModal(null)}
                        >
                            {REQUEST_COPY.done}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
