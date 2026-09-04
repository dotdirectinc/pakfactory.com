'use client';

import {useEffect, useId, useRef, useState} from 'react';
import Link from 'next/link';
import {ImagePlus, Trash2, X} from 'lucide-react';
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
import {CustomizationBuilder} from '@/components/customization-builder/customization-builder';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {MAX_REF_IMAGES} from '@/components/product/contents-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    createEmptyBuilderState,
    buildStepsFromCatalog,
    seedFromCustomizations,
    toRequestCustomizations,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import type {
    RequestLine,
    RequestReferenceImage,
    UpdateLinePatch,
} from '@/lib/request/request.storage';
import {productHref} from '@/lib/www-routes';

const TEXTAREA_CLASS =
    'min-h-[8.5rem] w-full min-w-0 rounded-sm border border-input bg-background px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

const LINK_ACTION_CLASS =
    'h-auto p-0 text-sm font-medium underline underline-offset-4';

type RequestLineCardProps = {
    line: RequestLine;
    selected: boolean;
    onSelectedChange: (selected: boolean) => void;
    onRemove: (lineId: string) => void;
    onUpdate: (lineId: string, patch: UpdateLinePatch) => void;
};

function resolveBuilderState(line: RequestLine): CustomizationBuilderState {
    if (line.customizationBuilder) return line.customizationBuilder;
    if (line.customizations.length) {
        return seedFromCustomizations(line.customizations);
    }
    return createEmptyBuilderState();
}

export function RequestLineCard({
    line,
    selected,
    onSelectedChange,
    onRemove,
    onUpdate,
}: RequestLineCardProps) {
    const title = line.productTitle ?? line.productSlug;
    const thumb = line.productMedia?.[0];
    const checkboxId = useId();
    const available = line.availableCustomizations ?? line.customizations;

    const [notesOpen, setNotesOpen] = useState(false);
    const [imagesOpen, setImagesOpen] = useState(false);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [builderDraft, setBuilderDraft] = useState<CustomizationBuilderState>(
        () => resolveBuilderState(line),
    );
    const [draftContents, setDraftContents] = useState(line.contents);
    const [draftNotes, setDraftNotes] = useState(line.notes ?? '');
    const [draftImages, setDraftImages] = useState<RequestReferenceImage[]>(
        line.referenceImages ?? [],
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!notesOpen) return;
        setDraftContents(line.contents);
        setDraftNotes(line.notes ?? '');
    }, [notesOpen, line.contents, line.notes]);

    useEffect(() => {
        if (!imagesOpen) return;
        setDraftImages(line.referenceImages ?? []);
    }, [imagesOpen, line.referenceImages]);

    useEffect(() => {
        if (!customizeOpen) return;
        setBuilderDraft(resolveBuilderState(line));
    }, [customizeOpen, line]);

    const room = MAX_REF_IMAGES - draftImages.length;
    const qtySummary = line.quantities
        .map((n) => n.toLocaleString('en-US'))
        .join(', ');

    function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length || room <= 0) return;
        const next = files.slice(0, room).map((file) => ({
            id:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `ref-${Date.now()}-${file.name}`,
            name: file.name,
            url: URL.createObjectURL(file),
        }));
        setDraftImages([...draftImages, ...next]);
    }

    function removeImage(imageId: string) {
        const doomed = draftImages.find((image) => image.id === imageId);
        if (doomed?.url.startsWith('blob:')) {
            URL.revokeObjectURL(doomed.url);
        }
        setDraftImages(draftImages.filter((image) => image.id !== imageId));
    }

    function saveNotes() {
        onUpdate(line.id, {
            contents: draftContents,
            notes: draftNotes,
        });
        setNotesOpen(false);
    }

    function saveImages() {
        onUpdate(line.id, {referenceImages: draftImages});
        setImagesOpen(false);
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

    return (
        <li className="flex gap-3 rounded-xl border border-border p-4">
            <div className="flex shrink-0 items-start pt-1">
                <Checkbox
                    id={checkboxId}
                    checked={selected}
                    onCheckedChange={(value) =>
                        onSelectedChange(value === true)
                    }
                    aria-label={`Select ${title}`}
                />
            </div>

            <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
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

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">
                            <Link
                                href={productHref(line.productSlug)}
                                className="hover:underline"
                            >
                                {title}
                            </Link>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {qtySummary
                                ? `${qtySummary} ${REQUEST_COPY.unitsSuffix}`
                                : null}
                            {line.contents
                                ? `${qtySummary ? ' · ' : ''}${line.contents}`
                                : null}
                        </p>
                        {line.customizations.length > 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {line.customizations
                                    .map((item) => item.label)
                                    .join(', ')}
                            </p>
                        ) : null}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={REQUEST_COPY.removeLine}
                        onClick={() => onRemove(line.id)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
                        onClick={() => setNotesOpen(true)}
                    >
                        {REQUEST_COPY.additionalNotesAction}
                    </Button>
                    <Button
                        type="button"
                        variant="link"
                        className={LINK_ACTION_CLASS}
                        onClick={() => setImagesOpen(true)}
                    >
                        {REQUEST_COPY.referenceImagesAction}
                    </Button>
                </div>
            </div>

            <CustomizationBuilder
                open={customizeOpen}
                onOpenChange={handleCustomizeOpenChange}
                availableCustomizations={available}
                value={builderDraft}
                onChange={setBuilderDraft}
                productTitle={title}
            />

            <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {REQUEST_COPY.additionalNotesAction}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor={`${checkboxId}-contents`}
                                className="text-sm font-medium"
                            >
                                {REQUEST_COPY.contentsLabel}
                            </Label>
                            <Input
                                id={`${checkboxId}-contents`}
                                value={draftContents}
                                onChange={(event) =>
                                    setDraftContents(event.target.value)
                                }
                                placeholder={REQUEST_COPY.contentsPlaceholder}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor={`${checkboxId}-notes`}
                                className="text-sm font-medium"
                            >
                                {REQUEST_COPY.additionalNotesLabel}
                            </Label>
                            <textarea
                                id={`${checkboxId}-notes`}
                                rows={6}
                                className={TEXTAREA_CLASS}
                                placeholder={
                                    REQUEST_COPY.additionalNotesPlaceholder
                                }
                                value={draftNotes}
                                onChange={(event) =>
                                    setDraftNotes(event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={saveNotes}>
                            {REQUEST_COPY.saveNotes}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={imagesOpen} onOpenChange={setImagesOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {REQUEST_COPY.referenceImagesAction}
                        </DialogTitle>
                    </DialogHeader>
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
                                    <img
                                        src={image.url}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Remove ${image.name}`}
                                        className="absolute top-0 right-0 size-5 rounded-none bg-background/80"
                                        onClick={() => removeImage(image.id)}
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
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={onPickFiles}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        aria-label={REQUEST_COPY.addImagesLabel}
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
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={saveImages}>
                            {REQUEST_COPY.saveImages}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}
