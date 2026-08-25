'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {cn} from '@pakfactory/ui/lib/utils';
import {AnnualSpendField} from '@/components/request/annual-spend-field';
import {
    BriefAssistUpload,
    type AssistFill,
} from '@/components/request/brief-assist-upload';
import {FilesDropzone} from '@/components/request/files-dropzone';
import {ShippingToAddress} from '@/components/request/shipping-to-address';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft} from '@/lib/request/request.storage';
import {expressQuantityDigits} from '@/lib/request/validation';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';
const TEXTAREA_CLASS =
    'min-h-28 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

type StepRequirementsProps = {
    draft: RequestDraft;
    expressCold: boolean;
    onPatch: (patch: Partial<RequestDraft>) => void;
    sectionRef?: React.Ref<HTMLElement>;
    className?: string;
};

export function StepRequirements({
    draft,
    expressCold,
    onPatch,
    sectionRef,
    className,
}: StepRequirementsProps) {
    const qtyDigits = expressQuantityDigits(draft.expressQuantity);
    const qtyNumber = Number(qtyDigits);
    const qtyError =
        qtyDigits.length === 0
            ? ''
            : qtyNumber > 0 && qtyNumber % 100 !== 0
              ? REQUEST_COPY.quantityError
              : '';

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
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {REQUEST_COPY.requirementsSubtitle}
                </p>
            </div>

            <div className="space-y-6">
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
                            <Input
                                inputMode="numeric"
                                className={FIELD_CLASS}
                                placeholder={REQUEST_COPY.quantityPlaceholder}
                                value={draft.expressQuantity}
                                onChange={(e) =>
                                    onPatch({
                                        expressQuantity: e.target.value.replace(
                                            /[^0-9]/g,
                                            '',
                                        ),
                                    })
                                }
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {REQUEST_COPY.quantityHelp}
                            </p>
                            {qtyError ? (
                                <p className="mt-1 text-xs text-destructive">
                                    {qtyError}
                                </p>
                            ) : null}
                        </div>
                    </>
                ) : null}

                <div>
                    <Label className="mb-1 block text-xs font-medium">
                        {REQUEST_COPY.notesLabel}
                        <span className="ml-0.5 text-amber-600">*</span>
                    </Label>
                    <textarea
                        className={TEXTAREA_CLASS}
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

                <AnnualSpendField
                    value={draft.annualSpend}
                    onChange={(annualSpend) => onPatch({annualSpend})}
                />

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
                    files={draft.artworkNames}
                    onPick={(names) =>
                        onPatch({
                            artworkNames: [...draft.artworkNames, ...names],
                        })
                    }
                />
            </div>
        </section>
    );
}
