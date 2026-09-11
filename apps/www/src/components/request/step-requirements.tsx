'use client';

import {useEffect, useRef, useState} from 'react';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {Textarea} from '@pakfactory/ui/components/textarea';
import {cn} from '@pakfactory/ui/lib/utils';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {
    BriefAssistUpload,
    type AssistFill,
} from '@/components/request/brief-assist-upload';
import {FilesDropzone} from '@/components/request/files-dropzone';
import {
    fileRejectionReason,
    useAttachmentUpload,
} from '@/lib/rfq/use-attachment-upload';
import type {RequestReferenceImage} from '@/lib/request/request.storage';
import {ShippingToAddress} from '@/components/request/shipping-to-address';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

type StepRequirementsProps = {
    draft: RequestDraft;
    expressCold: boolean;
    onPatch: (patch: Partial<RequestDraft>) => void;
    sectionRef?: React.Ref<HTMLElement>;
    className?: string;
    /** Optional strip above fields (e.g. include saved pool products). */
    poolBanner?: React.ReactNode;
};

export function StepRequirements({
    draft,
    expressCold,
    onPatch,
    sectionRef,
    className,
    poolBanner,
}: StepRequirementsProps) {
    // 🔴 Local state, then committed to the draft on change. The upload hook
    // needs a React setter — uploads finish out of order and each result is
    // written with `prev => …` keyed on id — whereas `onPatch` takes a whole
    // object. Building one from a captured `draft` would let two concurrent
    // uploads overwrite each other with stale snapshots.
    const [images, setImages] = useState<RequestReferenceImage[]>(
        draft.referenceImages ?? [],
    );
    const [rejected, setRejected] = useState<string[]>([]);
    const upload = useAttachmentUpload(draft.id, setImages);

    const onPatchRef = useRef(onPatch);
    onPatchRef.current = onPatch;

    useEffect(() => {
        // `onPatch` is not stable across renders, so it is read through a ref
        // rather than listed as a dependency — depending on it directly would
        // commit on every render. `images` is the only real input.
        onPatchRef.current({referenceImages: images});
    }, [images]);

    function onPickFiles(files: File[]) {
        // Filtered before anything is shown: the signed S3 policy enforces type
        // and size, but a rejection there is an opaque 403 after the bytes have
        // gone up. Here we can say which file, and why.
        const reasons: string[] = [];
        const accepted = files.filter((file) => {
            const reason = fileRejectionReason(file);
            if (reason) reasons.push(reason);
            return !reason;
        });
        setRejected(reasons);
        if (accepted.length) void upload(accepted);
    }

    function onAssistFill(fields: AssistFill) {
        onPatch({
            packagingContents: fields.packagingContents,
            notes: fields.notes,
            shippingAddress: {
                ...(draft.shippingAddress ?? {}),
                country: fields.region.includes('Canada')
                    ? 'Canada'
                    : draft.shippingAddress?.country,
            },
        });
    }

    return (
        <section
            id="section-requirements"
            data-section="requirements"
            ref={sectionRef}
            className={cn(
                expressCold ? 'pb-16 pt-0' : 'border-t border-border/60 py-16',
                className,
            )}
        >
            <div className="mb-7">
                <h2 className="text-[26px] font-semibold tracking-tight">
                    {REQUEST_COPY.requirementsTitle}
                </h2>
                {REQUEST_COPY.requirementsSubtitle ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {REQUEST_COPY.requirementsSubtitle}
                    </p>
                ) : null}
            </div>

            <div className="space-y-6">
                {poolBanner}

                <BriefAssistUpload onFill={onAssistFill} />

                {expressCold ? (
                    <>
                        <div>
                            <Label className="mb-1 block text-xs font-medium">
                                {REQUEST_COPY.contentsLabel}
                                <span className="ml-0.5 text-amber-600">*</span>
                            </Label>
                            <Input
                                className={FIELD_CLASS}
                                placeholder={REQUEST_COPY.contentsPlaceholder}
                                value={draft.packagingContents}
                                onChange={(e) =>
                                    onPatch({
                                        packagingContents: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label className="mb-1 block text-xs font-medium">
                                {REQUEST_COPY.quantityLabel}
                                <span className="ml-0.5 text-amber-600">*</span>
                            </Label>
                            <QuantityPicker
                                className="mt-2"
                                volumes={draft.expressQuantities}
                                onAdd={(volume) =>
                                    onPatch({
                                        expressQuantities: [
                                            ...new Set([
                                                ...draft.expressQuantities,
                                                volume,
                                            ]),
                                        ].sort((a, b) => a - b),
                                    })
                                }
                                onRemove={(volume) =>
                                    onPatch({
                                        expressQuantities:
                                            draft.expressQuantities.filter(
                                                (n) => n !== volume,
                                            ),
                                    })
                                }
                            />
                        </div>
                    </>
                ) : null}

                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                        <Label className="text-xs font-medium">
                            {REQUEST_COPY.notesLabel}
                            <span className="ml-0.5 text-amber-600">*</span>
                        </Label>
                        <button
                            type="button"
                            className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                            onClick={() => {
                                document
                                    .getElementById('section-requirements-files')
                                    ?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                    });
                            }}
                        >
                            {REQUEST_COPY.preferUploadDocument}
                        </button>
                    </div>
                    <Textarea
                        className="min-h-28 rounded-sm bg-background text-sm"
                        placeholder={REQUEST_COPY.notesPlaceholder}
                        value={draft.notes}
                        onChange={(e) => onPatch({notes: e.target.value})}
                    />
                </div>

                {expressCold ? (
                    <div>
                        <Label className="mb-1 block text-xs font-medium">
                            {REQUEST_COPY.timelineLabel}
                        </Label>
                        <Input
                            className={FIELD_CLASS}
                            placeholder={REQUEST_COPY.timelinePlaceholder}
                            value={draft.timeline}
                            onChange={(e) =>
                                onPatch({timeline: e.target.value})
                            }
                        />
                    </div>
                ) : null}

                <ShippingToAddress
                    value={draft.shippingAddress}
                    onChange={(shippingAddress) => onPatch({shippingAddress})}
                />

                <FilesDropzone
                    linkLabel={
                        expressCold
                            ? REQUEST_COPY.addFilesLabel
                            : REQUEST_COPY.additionalFilesLabel
                    }
                    dropTitle={
                        expressCold
                            ? REQUEST_COPY.filesExpressDropTitle
                            : REQUEST_COPY.filesDropTitle
                    }
                    images={images}
                    rejected={rejected}
                    onPick={onPickFiles}
                />
            </div>
        </section>
    );
}
