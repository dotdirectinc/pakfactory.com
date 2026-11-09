'use client';

import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {useRequest} from '@/lib/request/request-provider';
import {hasConfiguredProduct} from '@/lib/request/validation';
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
import {BriefOrFiles} from '@/components/intake/fields/brief-or-files';
import type {RequestFlow} from '@/lib/intake/routes';
import {hasNeed, NEED_PACKAGING} from '@/lib/intake/needs';
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
    /**
     * Step shell (general quote intake, Nov 1): `packaging` = what's packaged + quantity;
     * `brief` = brief or files (bare: no deadline, no "upload instead" link; owner Nov 2).
     * Default `all` = the one-page form.
     */
    part?: 'all' | 'packaging' | 'brief';
    /** Step shell: the screen supplies the heading and spacing. */
    bare?: boolean;
    /** Step intake: which request, for the project details example and hint. */
    intakeFlow?: RequestFlow;
    /** Describe-first brief: description and Add files side by side. */
    columns?: boolean;
};

export function StepRequirements({
    draft,
    expressCold,
    onPatch,
    sectionRef,
    className,
    poolBanner,
    part = 'all',
    bare = false,
    intakeFlow,
    columns = false,
}: StepRequirementsProps) {
    const showPackaging = part !== 'brief';
    const showBrief = part !== 'packaging';
    // 🔴 Local state, then committed to the draft on change. The upload hook
    // needs a React setter — uploads finish out of order and each result is
    // written with `prev => …` keyed on id — whereas `onPatch` takes a whole
    // object. Building one from a captured `draft` would let two concurrent
    // uploads overwrite each other with stale snapshots.
    const [images, setImages] = useState<RequestReferenceImage[]>(
        draft.referenceImages ?? [],
    );
    const [rejected, setRejected] = useState<string[]>([]);
    // PROD-3181: brief optional with a configured product (rules); Deadline on every request.
    const {lines} = useRequest();
    // Owner, Oct 29: the Brief is always required, so it is never labelled optional.
    const briefOptional = hasConfiguredProduct(lines) && Boolean(REQUEST_FORM_RULES.briefOptionalWithProducts);
    // PROD-3182 (POC round 1): which page the buyer came from.
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

    function onRemoveFile(imageId: string) {
        setImages((prev) => {
            const doomed = prev.find((image) => image.id === imageId);
            if (doomed?.url?.startsWith('blob:')) URL.revokeObjectURL(doomed.url);
            // S3 pending/ objects are left for lifecycle expiry (same as PDP / contents-field).
            return prev.filter((image) => image.id !== imageId);
        });
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
                bare ? undefined : expressCold ? 'pb-16 pt-0' : 'border-t border-border/60 py-16',
                className,
            )}
        >
            {bare ? null : (
                <div className="mb-7">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {REQUEST_COPY.requirementsTitle}
                    </h2>
                    {REQUEST_COPY.requirementsSubtitle ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            {REQUEST_COPY.requirementsSubtitle}
                        </p>
                    ) : null}
                </div>
            )}

            <div className="space-y-6">
                {showPackaging ? poolBanner : null}

                {showBrief ? <BriefAssistUpload onFill={onAssistFill} /> : null}

                {showPackaging && expressCold && hasNeed(draft, NEED_PACKAGING) ? (
                    <>
                        <div className={bare ? 'flex flex-col gap-2' : undefined}>
                            {/* Owner Nov 6: step-intake labels match "What do you need?" (text-base). */}
                            <div className={bare ? 'flex flex-col gap-1' : undefined}>
                                <Label className={bare ? 'block text-base font-medium' : 'mb-1 block text-xs font-medium'}>
                                    {bare ? REQUEST_COPY.intakeQuantityLabel : REQUEST_COPY.quantityLabel}
                                    {bare ? null : <span className="ml-0.5 text-amber-600">*</span>}
                                </Label>
                                {bare ? (
                                    <p className="text-sm text-muted-foreground">{REQUEST_COPY.intakeQuantityHint}</p>
                                ) : null}
                            </div>
                            <QuantityPicker
                                {...(bare ? {placeholder: REQUEST_COPY.intakeQuantityPlaceholder} : {})}
                                className={bare ? undefined : 'mt-2'}
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
                        {/* v4.7 (owner Nov 6): the step intake doesn't ask what's going inside this
                            phase; packagingContents stays in the payload (empty) for Sales. */}
                        {bare ? null : (
                        <div>
                            <Label className="mb-1 block text-xs font-medium">
                                {bare ? REQUEST_COPY.intakeContentsLabel : REQUEST_COPY.contentsLabel}
                                {bare ? null : <span className="ml-0.5 text-amber-600">*</span>}
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
                        )}
                    </>
                ) : null}

                {showBrief && bare ? (
                    // Step intake (c93, owner Nov 2): upload your brief, or describe your project.
                    <BriefOrFiles
                        notes={draft.notes}
                        onNotes={(notes) => onPatch({notes})}
                        images={images}
                        rejected={rejected}
                        onPick={onPickFiles}
                        onRemove={onRemoveFile}
                        {...(intakeFlow ? {flow: intakeFlow} : {})}
                        {...(columns ? {columns: true} : {})}
                    />
                ) : showBrief ? (
                <>
                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-4">
                        <Label className="text-xs font-medium">
                            {REQUEST_COPY.notesLabel}
                            {briefOptional ? (
                                <span className="ml-1 font-normal text-muted-foreground">
                                    {REQUEST_COPY.optional}
                                </span>
                            ) : (
                                bare ? null : <span className="ml-0.5 text-amber-600">*</span>
                            )}
                        </Label>
                        {bare ? null : (
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
                        )}
                    </div>
                    <Textarea
                        className="min-h-28 rounded-sm bg-background text-sm"
                        placeholder={REQUEST_COPY.notesPlaceholder}
                        value={draft.notes}
                        onChange={(e) => onPatch({notes: e.target.value})}
                    />
                </div>

                {/* Owner Nov 2: the step intake doesn't ask for a deadline. */}
                {!bare ? (
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

                {draft.express && draft.shipToOptional ? null : (
                    <ShippingToAddress
                        value={draft.shippingAddress}
                        onChange={(shippingAddress) => onPatch({shippingAddress})}
                    />
                )}

                <FilesDropzone
                    linkLabel={
                        bare
                            ? REQUEST_COPY.intakeFilesLabel
                            : expressCold
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
                </>
                ) : null}
            </div>
        </section>
    );
}
