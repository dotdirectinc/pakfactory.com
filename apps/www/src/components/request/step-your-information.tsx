'use client';

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
import {INDUSTRY_OPTIONS, REQUEST_COPY} from '@/lib/copy/request';
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
    function patchOffice(next: Partial<ShippingAddress>) {
        onPatch({
            companyAddress: normalizeAddress({
                ...(draft.companyAddress ?? {}),
                ...next,
            }),
        });
    }

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
                {REQUEST_COPY.contactDesc ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {REQUEST_COPY.contactDesc}
                    </p>
                ) : null}
            </div>

            <div className="space-y-3">
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
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            className={FIELD_CLASS}
                            placeholder="Street"
                            value={draft.companyAddress?.line1 ?? ''}
                            onChange={(e) =>
                                patchOffice({line1: e.target.value})
                            }
                        />
                        <Input
                            className={FIELD_CLASS}
                            placeholder="City"
                            value={draft.companyAddress?.city ?? ''}
                            onChange={(e) =>
                                patchOffice({city: e.target.value})
                            }
                        />
                        <Input
                            className={FIELD_CLASS}
                            placeholder="Region"
                            value={draft.companyAddress?.region ?? ''}
                            onChange={(e) =>
                                patchOffice({region: e.target.value})
                            }
                        />
                        <Input
                            className={FIELD_CLASS}
                            placeholder="Country"
                            value={draft.companyAddress?.country ?? ''}
                            onChange={(e) =>
                                patchOffice({country: e.target.value})
                            }
                        />
                    </div>
                </div>

                <AnnualSpendField
                    className="pt-4"
                    value={draft.annualSpend}
                    onChange={(annualSpend) => onPatch({annualSpend})}
                />
            </div>
        </section>
    );
}
