'use client';

import {useEffect, useId, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {ImagePlus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {Textarea} from '@pakfactory/ui/components/textarea';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {DestructiveConfirmDialog} from '@/components/common/destructive-confirm-dialog';
import {MAX_REF_IMAGES} from '@/components/product/contents-field';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    createEmptyBuilderState,
    buildStepsFromCatalog,
    DIMENSIONS_STEP_KEY,
    getAnswer,
    seedFromCustomizations,
    summarizeAnswer,
    toRequestCustomizations,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import {
    fileRejectionReason,
    useAttachmentUpload,
} from '@/lib/rfq/use-attachment-upload';
import type {
    RequestLine,
    RequestReferenceImage,
    UpdateLinePatch,
} from '@/lib/request/request.storage';
import {productHref} from '@/lib/www-routes';

const CustomizationBuilder = dynamic(
    () =>
        import('@/components/customization-builder/customization-builder').then(
            (mod) => mod.CustomizationBuilder,
        ),
    {ssr: false},
);

const LINK_ACTION_CLASS =
    'h-auto p-0 text-xs font-medium underline underline-offset-4';

type ProductRequestCardProps = {
    line: RequestLine;
    /** Draft id for reference-image uploads (presign scope). */
    draftId: string;
    onRemove: (lineId: string) => void;
    onUpdate: (lineId: string, patch: UpdateLinePatch) => void;
    /** Pool selection checkbox — Your Request only. */
    selectable?: boolean;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
};

type SpecRow = {key: string; label: string; value: string};

function resolveBuilderState(line: RequestLine): CustomizationBuilderState {
    if (line.customizationBuilder) return line.customizationBuilder;
    if (line.customizations.length) {
        return seedFromCustomizations(line.customizations);
    }
    return createEmptyBuilderState();
}

function formatQuantityUnits(quantities: number[]): string {
    return quantities
        .map((n) => `${n.toLocaleString('en-US')} ${REQUEST_COPY.unitsSuffix}`)
        .join(', ');
}

function humanizeCategorySlug(category: string): string {
    if (!category) return category;
    return category
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function resolveCategoryLabel(
    category: string,
    available: RequestLine['availableCustomizations'],
): string {
    const titled = available?.find(
        (option) => option.category === category && option.categoryTitle,
    )?.categoryTitle;
    return titled?.trim() || humanizeCategorySlug(category);
}

function buildSpecRows(line: RequestLine): SpecRow[] {
    const rows: SpecRow[] = [];
    const builder = resolveBuilderState(line);
    const dimensionsAnswer = getAnswer(builder, DIMENSIONS_STEP_KEY);
    if (dimensionsAnswer.status !== 'unset') {
        rows.push({
            key: DIMENSIONS_STEP_KEY,
            label: 'Dimensions',
            value: summarizeAnswer(
                dimensionsAnswer,
                CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
            ),
        });
    }

    const available = line.availableCustomizations;
    for (const customization of line.customizations) {
        const value = customization.label?.trim();
        if (!value) continue;
        rows.push({
            key: customization.id,
            label: resolveCategoryLabel(customization.category, available),
            value,
        });
    }

    return rows;
}

export function ProductRequestCard({
    line,
    draftId,
    onRemove,
    onUpdate,
    selectable = false,
    selected = false,
    onSelectedChange,
}: ProductRequestCardProps) {
    const title = line.productTitle ?? line.productSlug;
    const thumb = line.productMedia?.[0];
    const fieldId = useId();
    const available = line.availableCustomizations ?? line.customizations;

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [qtyOpen, setQtyOpen] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [builderDraft, setBuilderDraft] = useState<CustomizationBuilderState>(
        () => resolveBuilderState(line),
    );
    const [draftContents, setDraftContents] = useState(line.contents);
    const [draftNotes, setDraftNotes] = useState(line.notes ?? '');
    const [draftImages, setDraftImages] = useState<RequestReferenceImage[]>(
        line.referenceImages ?? [],
    );
    const [draftQuantities, setDraftQuantities] = useState(line.quantities);
    const [rejected, setRejected] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const upload = useAttachmentUpload(draftId, setDraftImages);

    useEffect(() => {
        if (!detailsOpen) return;
        setDraftContents(line.contents);
        setDraftNotes(line.notes ?? '');
        setDraftImages(line.referenceImages ?? []);
        setRejected([]);
    }, [detailsOpen, line.contents, line.notes, line.referenceImages]);

    useEffect(() => {
        if (!customizeOpen) return;
        setBuilderDraft(resolveBuilderState(line));
    }, [customizeOpen, line]);

    useEffect(() => {
        if (!qtyOpen) return;
        setDraftQuantities(line.quantities);
    }, [qtyOpen, line.quantities]);

    const room = MAX_REF_IMAGES - draftImages.length;
    const qtyUnits = formatQuantityUnits(line.quantities);
    const metaParts = [line.productLineTitle?.trim(), qtyUnits || null].filter(
        Boolean,
    );
    const metaLine = metaParts.join(' · ');
    const specRows = buildSpecRows(line);

    function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!picked.length || room <= 0) return;

        // Same pre-filter as the product rail: the signed S3 policy enforces type
        // and size, but a rejection there is an opaque 403 after the bytes have
        // gone up. Here we can say which file, and why.
        const reasons: string[] = [];
        const accepted = picked.slice(0, room).filter((file) => {
            const reason = fileRejectionReason(file);
            if (reason) reasons.push(reason);
            return !reason;
        });
        setRejected(reasons);
        if (accepted.length) void upload(accepted);
    }

    function removeImage(imageId: string) {
        const doomed = draftImages.find((image) => image.id === imageId);
        if (doomed?.url.startsWith('blob:')) {
            URL.revokeObjectURL(doomed.url);
        }
        // The S3 object under `pending/` is left to the bucket's 30-day lifecycle
        // sweep. It is only promoted to `rfq/` if its key reaches submit, which it
        // now cannot — and minting a delete permit for the browser would be a
        // larger hole than letting the sweep handle it.
        setDraftImages((prev) => prev.filter((image) => image.id !== imageId));
    }

    function saveDetails() {
        onUpdate(line.id, {
            contents: draftContents,
            notes: draftNotes,
            referenceImages: draftImages,
        });
        setDetailsOpen(false);
    }

    function saveQuantities() {
        if (draftQuantities.length === 0) return;
        onUpdate(line.id, {quantities: draftQuantities});
        setQtyOpen(false);
    }

    function handleCustomizeOpenChange(open: boolean) {
        if (!open) {
            onUpdate(line.id, {
                customizationBuilder: builderDraft,
                customizations: toRequestCustomizations(
                    builderDraft,
                    CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
                    buildStepsFromCatalog(available),
                ),
            });
        }
        setCustomizeOpen(open);
    }

    const card = (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background sm:flex-row sm:items-stretch">
            <div className="mx-auto aspect-square w-[115px] max-h-[115px] shrink-0 self-start bg-background p-4 sm:mx-0">
                <div className="size-full overflow-hidden rounded-md bg-muted">
                    {thumb?.src ? (
                        // Catalog media URLs are static fixture assets.
                        <img
                            src={thumb.src}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                        </span>
                    )}
                </div>
            </div>

            <div className="min-w-0 flex-1 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-base font-semibold tracking-tight">
                            <Link
                                href={productHref(line.productSlug)}
                                className="text-foreground no-underline hover:underline"
                            >
                                {title}
                            </Link>
                        </p>
                        {metaLine || qtyUnits ? (
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                                {metaLine ? <span>{metaLine}</span> : null}
                                {qtyUnits ? (
                                    <Button
                                        type="button"
                                        variant="link"
                                        className={LINK_ACTION_CLASS}
                                        onClick={() => setQtyOpen(true)}
                                    >
                                        {REQUEST_COPY.paperEdit}
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    {selectable ? (
                        <Checkbox
                            id={fieldId}
                            checked={selected}
                            onCheckedChange={(value) =>
                                onSelectedChange?.(value === true)
                            }
                            aria-label={`Select ${title}`}
                            className="mt-1 shrink-0"
                        />
                    ) : null}
                </div>

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

                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Button
                        type="button"
                        variant="link"
                        className={LINK_ACTION_CLASS}
                        onClick={() => setCustomizeOpen(true)}
                    >
                        {REQUEST_COPY.customizeLine}
                    </Button>
                    <Button
                        type="button"
                        variant="link"
                        className={LINK_ACTION_CLASS}
                        onClick={() => setDetailsOpen(true)}
                    >
                        {REQUEST_COPY.notesAndImagesAction}
                    </Button>
                    <Button
                        type="button"
                        variant="link"
                        className={cn(
                            LINK_ACTION_CLASS,
                            'ml-auto text-destructive',
                        )}
                        onClick={() => setRemoveOpen(true)}
                    >
                        {REQUEST_COPY.removeLine}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <li>
            {card}

            <DestructiveConfirmDialog
                open={removeOpen}
                onOpenChange={setRemoveOpen}
                title={REQUEST_COPY.removeLineConfirmTitle}
                description={REQUEST_COPY.removeLineConfirmDescription.replace(
                    '{title}',
                    title,
                )}
                cancelLabel={REQUEST_COPY.removeLineConfirmCancel}
                confirmLabel={REQUEST_COPY.removeLineConfirmAction}
                onConfirm={() => {
                    onRemove(line.id);
                    setRemoveOpen(false);
                }}
            />

            <CustomizationBuilder
                open={customizeOpen}
                onOpenChange={handleCustomizeOpenChange}
                availableCustomizations={available}
                value={builderDraft}
                onChange={setBuilderDraft}
                productTitle={title}
                dimensionRange={line.dimensionRange}
            />

            <Dialog open={qtyOpen} onOpenChange={setQtyOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{REQUEST_COPY.quantityLabel}</DialogTitle>
                    </DialogHeader>
                    <QuantityPicker
                        volumes={draftQuantities}
                        onAdd={(volume) =>
                            setDraftQuantities((prev) =>
                                [...new Set([...prev, volume])].sort(
                                    (a, b) => a - b,
                                ),
                            )
                        }
                        onRemove={(volume) =>
                            setDraftQuantities((prev) =>
                                prev.filter((item) => item !== volume),
                            )
                        }
                        unitLabel={REQUEST_COPY.unitsSuffix}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            disabled={draftQuantities.length === 0}
                            onClick={saveQuantities}
                        >
                            {REQUEST_COPY.saveNotes}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {REQUEST_COPY.notesAndImagesAction}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor={`${fieldId}-contents`}
                                className="text-sm font-medium"
                            >
                                {REQUEST_COPY.contentsLabel}
                            </Label>
                            <Input
                                id={`${fieldId}-contents`}
                                value={draftContents}
                                onChange={(event) =>
                                    setDraftContents(event.target.value)
                                }
                                placeholder={REQUEST_COPY.contentsPlaceholder}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor={`${fieldId}-notes`}
                                className="text-sm font-medium"
                            >
                                {REQUEST_COPY.additionalNotesLabel}
                            </Label>
                            <Textarea
                                id={`${fieldId}-notes`}
                                rows={6}
                                className="min-h-[8.5rem] rounded-sm bg-background"
                                placeholder={
                                    REQUEST_COPY.additionalNotesPlaceholder
                                }
                                value={draftNotes}
                                onChange={(event) =>
                                    setDraftNotes(event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium">
                                {REQUEST_COPY.addImagesLabel}
                                <span className="ml-1 font-normal text-muted-foreground">
                                    {REQUEST_COPY.optional}
                                </span>
                            </Label>
                            <div className="flex flex-wrap items-center gap-2">
                                {draftImages.map((image) => (
                                    <div
                                        key={image.id}
                                        className="relative size-11 overflow-hidden rounded-md border border-border bg-muted"
                                    >
                                        {/* Local object URL — the preview only. What
                                            the backend receives is `image.key`. */}
                                        <img
                                            src={image.url}
                                            alt=""
                                            className={`size-full object-cover ${
                                                image.status === 'uploaded'
                                                    ? ''
                                                    : 'opacity-40'
                                            }`}
                                        />
                                        {image.status === 'uploading' ? (
                                            <span
                                                className="absolute inset-0 grid place-items-center text-[10px] font-medium text-foreground"
                                                role="status"
                                            >
                                                {REQUEST_COPY.imageUploading}
                                            </span>
                                        ) : null}
                                        {image.status === 'error' ? (
                                            <span className="absolute inset-0 grid place-items-center bg-destructive/10 text-[10px] font-medium text-destructive">
                                                {REQUEST_COPY.imageFailed}
                                            </span>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label={`Remove ${image.name}`}
                                            className="absolute top-0 right-0 size-5 rounded-none bg-background/80"
                                            onClick={() =>
                                                removeImage(image.id)
                                            }
                                        >
                                            <X className="size-3" />
                                        </Button>
                                    </div>
                                ))}
                                {room > 0 ? (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                            multiple
                                            className="sr-only"
                                            onChange={onPickFiles}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            aria-label={
                                                REQUEST_COPY.addImagesLabel
                                            }
                                            className="size-11"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <ImagePlus className="size-4" />
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                            {rejected.length ? (
                                <ul className="mt-1 flex flex-col gap-0.5">
                                    {rejected.map((reason) => (
                                        <li
                                            key={reason}
                                            className="text-xs text-destructive"
                                        >
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={saveDetails}>
                            {REQUEST_COPY.saveNotes}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}
