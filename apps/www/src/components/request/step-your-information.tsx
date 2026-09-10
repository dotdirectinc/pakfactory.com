'use client';

import {useState} from 'react';
import {Check, Pencil} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {AnnualSpendField} from '@/components/request/annual-spend-field';
import {AddressFormFields} from '@/components/request/address-form-fields';
import {INDUSTRY_OPTIONS, REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestDraft, ShippingAddress} from '@/lib/request/request.storage';
import {normalizeAddress} from '@/lib/request/shipping-address';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

type StepYourInformationProps = {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    sectionRef?: React.Ref<HTMLElement>;
};

function LabeledInput({
    label,
    required,
    optional,
    ...props
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
} & React.ComponentProps<'input'>) {
    return (
        <div>
            <Label className="mb-1 block text-xs font-medium">
                {label}
                {required ? (
                    <span className="ml-0.5 text-amber-600">*</span>
                ) : optional ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                        {REQUEST_COPY.optional}
                    </span>
                ) : null}
            </Label>
            <Input className={FIELD_CLASS} {...props} />
        </div>
    );
}

export function StepYourInformation({
    draft,
    onPatch,
    sectionRef,
}: StepYourInformationProps) {
    const {viewer} = useRequest();
    const [editing, setEditing] = useState(false);

    /**
     * Collapse only when the account actually answered the required fields.
     *
     * A summary card is a claim that this step is DONE. An email/password
     * account supplies an address and nothing else, so collapsing on
     * `viewer` alone would hide two empty required name fields behind a card
     * that reads as complete — and the buyer would meet the error at submit,
     * one step further on, with no idea which section it came from.
     */
    const collapsed =
        Boolean(viewer) &&
        !editing &&
        draft.contactFirstName.trim().length > 0 &&
        draft.contactLastName.trim().length > 0;

    const officeLine = [
        draft.companyAddress?.line1,
        draft.companyAddress?.city,
        draft.companyAddress?.region,
        draft.companyAddress?.postalCode,
        draft.companyAddress?.country,
    ]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' · ');

    function patchOffice(next: Partial<ShippingAddress>) {
        onPatch({
            companyAddress: normalizeAddress({
                ...(draft.companyAddress ?? {}),
                ...next,
            }),
        });
    }

    const fullName =
        `${draft.contactFirstName} ${draft.contactLastName}`.trim() ||
        viewer?.email ||
        '';
    const initials =
        `${draft.contactFirstName.charAt(0)}${draft.contactLastName.charAt(0)}`
            .trim()
            .toUpperCase() || (viewer?.email ?? '?').charAt(0).toUpperCase();

    return (
        <section
            id="section-information"
            data-section="information"
            ref={sectionRef}
            className="border-t border-border/60 py-16"
        >
            <div className="mb-7">
                <h2 className="text-2xl font-semibold tracking-tight">
                    {REQUEST_COPY.contactHeading}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {collapsed
                        ? REQUEST_COPY.contactDesc
                        : REQUEST_COPY.contactDescEditing}
                </p>
            </div>

            {collapsed ? (
                <div>
                    <div className="flex items-center gap-3.5 rounded-md border border-border bg-muted/40 p-4">
                        <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary"
                            aria-hidden
                        >
                            {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                                {fullName}
                            </p>
                            <p className="truncate text-[13px] text-muted-foreground">
                                {[draft.contactEmail, draft.contactCompany]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                            {officeLine ? (
                                <p className="truncate text-[13px] text-muted-foreground">
                                    {officeLine}
                                </p>
                            ) : null}
                        </div>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto shrink-0 gap-1.5 px-0 text-[12.5px] font-medium"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil className="size-3.5" aria-hidden />
                            {REQUEST_COPY.contactEdit}
                        </Button>
                    </div>
                    <p className="mt-2.5 px-0.5 text-[12.5px] text-muted-foreground">
                        {REQUEST_COPY.contactReplyNote}
                    </p>
                </div>
            ) : (
            <div className="space-y-3">
                {viewer ? (
                    <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                            <Check
                                className="size-4 text-emerald-600"
                                aria-hidden
                            />
                            {REQUEST_COPY.contactSignedInAs} {viewer.email}
                        </p>
                        <p className="mt-0.5 pl-[22px] text-[12.5px] text-muted-foreground">
                            {REQUEST_COPY.contactPrefilledNote}
                        </p>
                    </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                        label={REQUEST_COPY.firstName}
                        required
                        value={draft.contactFirstName}
                        onChange={(e) =>
                            onPatch({contactFirstName: e.target.value})
                        }
                    />
                    <LabeledInput
                        label={REQUEST_COPY.lastName}
                        required
                        value={draft.contactLastName}
                        onChange={(e) =>
                            onPatch({contactLastName: e.target.value})
                        }
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                        label={REQUEST_COPY.workEmail}
                        required
                        type="email"
                        value={draft.contactEmail}
                        onChange={(e) =>
                            onPatch({contactEmail: e.target.value})
                        }
                        /*
                         * Locked to the account address for a signed-in buyer.
                         * `readOnly`, NOT `disabled`: a disabled input is skipped
                         * by form serialisation and is not reachable by keyboard
                         * or announced by a screen reader, so the one field the
                         * quote is sent to would become invisible to anyone not
                         * using a mouse. readOnly keeps it focusable, copyable
                         * and announced, and still refuses edits.
                         */
                        readOnly={Boolean(viewer)}
                        aria-readonly={Boolean(viewer) || undefined}
                        title={
                            viewer ? REQUEST_COPY.contactEmailLocked : undefined
                        }
                        className={
                            viewer
                                ? `${FIELD_CLASS} cursor-not-allowed bg-muted/60 text-muted-foreground`
                                : FIELD_CLASS
                        }
                    />
                    <LabeledInput
                        label={REQUEST_COPY.phone}
                        optional
                        value={draft.contactPhone}
                        onChange={(e) =>
                            onPatch({contactPhone: e.target.value})
                        }
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                        label={REQUEST_COPY.company}
                        optional
                        value={draft.contactCompany}
                        onChange={(e) =>
                            onPatch({contactCompany: e.target.value})
                        }
                    />
                    <div>
                        <Label className="mb-1 block text-xs font-medium">
                            {REQUEST_COPY.industry}
                            <span className="ml-1 font-normal text-muted-foreground">
                                {REQUEST_COPY.optional}
                            </span>
                        </Label>
                        <Select
                            value={draft.contactIndustry || undefined}
                            onValueChange={(v) =>
                                onPatch({contactIndustry: v})
                            }
                        >
                            <SelectTrigger className="h-11 w-full rounded-sm border border-input bg-background text-sm data-[size=default]:h-11">
                                <SelectValue placeholder="Select an industry" />
                            </SelectTrigger>
                            <SelectContent>
                                {INDUSTRY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="pt-4">
                    <Label className="mb-1 block text-sm font-medium">
                        {REQUEST_COPY.companyOffice}
                        <span className="ml-0.5 text-amber-600">*</span>
                    </Label>
                    <p className="mb-4 text-xs text-muted-foreground">
                        {REQUEST_COPY.companyAddressHelp}
                    </p>
                    <AddressFormFields
                        value={{
                            line1: draft.companyAddress?.line1,
                            line2: draft.companyAddress?.line2,
                            city: draft.companyAddress?.city,
                            region: draft.companyAddress?.region,
                            country: draft.companyAddress?.country,
                            postalCode: draft.companyAddress?.postalCode,
                            countryCode: draft.companyAddress?.countryCode,
                            regionCode: draft.companyAddress?.regionCode,
                        }}
                        onPatch={patchOffice}
                    />
                </div>

                <AnnualSpendField
                    className="pt-4"
                    value={draft.annualSpend}
                    onChange={(annualSpend) => onPatch({annualSpend})}
                />
            </div>
            )}
        </section>
    );
}
