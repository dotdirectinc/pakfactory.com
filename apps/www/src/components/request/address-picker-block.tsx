'use client';

import {useState} from 'react';
import {MapPin, Pencil} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Label} from '@pakfactory/ui/components/label';
import {LoginDialog} from '@/components/login/login-dialog';
import {AddressFormFields} from '@/components/request/address-form-fields';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {ShippingAddress} from '@/lib/request/request.storage';
import {
    formatAddressSummaryLine,
    hasShippingLocation,
    makeShippingId,
    normalizeAddress,
} from '@/lib/request/shipping-address';

type AddressPickerBlockProps = {
    value: ShippingAddress | null;
    onChange: (address: ShippingAddress) => void;
    title: string;
    /** Dialog title when editing the address. */
    dialogTitle: string;
    fallbackLabel: string;
    required?: boolean;
    helpText?: string;
    /** When true, show Sign in for anonymous viewers (ship-to). */
    showSignInWhenSignedOut?: boolean;
    className?: string;
};

function emptyAddressDraft(): ShippingAddress {
    return normalizeAddress({id: makeShippingId()});
}

/**
 * Label + address form / muted summary card + edit dialog.
 * Props-only; parents own draft wiring and copy.
 */
export function AddressPickerBlock({
    value,
    onChange,
    title,
    dialogTitle,
    fallbackLabel,
    required = false,
    helpText,
    showSignInWhenSignedOut = false,
    className,
}: AddressPickerBlockProps) {
    const {viewer} = useRequest();
    const [loginOpen, setLoginOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [editDraft, setEditDraft] = useState<ShippingAddress>(emptyAddressDraft);

    const locationReady = hasShippingLocation(value);
    const showSummary = Boolean(viewer) && locationReady;

    function patch(next: Partial<ShippingAddress>) {
        onChange(
            normalizeAddress({
                ...(value ?? {}),
                ...next,
            }),
        );
    }

    function openEditor() {
        setEditDraft(
            value
                ? normalizeAddress(value)
                : emptyAddressDraft(),
        );
        setPickerOpen(true);
    }

    function saveAddress() {
        if (!hasShippingLocation(editDraft)) return;
        onChange(normalizeAddress(editDraft));
        setPickerOpen(false);
    }

    const summaryTitle = value?.label?.trim() || fallbackLabel;
    const summaryLine = value ? formatAddressSummaryLine(value) : '';

    return (
        <div className={className}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <Label className="text-xs font-medium">
                    {title}
                    {required ? (
                        <span className="ml-0.5 text-amber-600">*</span>
                    ) : null}
                </Label>
                {showSignInWhenSignedOut && !viewer ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto cursor-pointer px-0 text-xs font-medium text-muted-foreground underline underline-offset-4"
                        onClick={() => setLoginOpen(true)}
                    >
                        {REQUEST_COPY.signIn}
                    </Button>
                ) : null}
            </div>
            {helpText ? (
                <p className="mb-4 text-xs text-muted-foreground">{helpText}</p>
            ) : null}

            {showSummary && value ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
                    <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"
                        aria-hidden
                    >
                        <MapPin className="size-4 text-foreground" />
                    </span>
                    <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer text-left"
                        onClick={openEditor}
                    >
                        <p className="truncate text-sm font-medium text-foreground">
                            {summaryTitle}
                        </p>
                        {summaryLine ? (
                            <p className="truncate text-[13px] text-muted-foreground">
                                {summaryLine}
                            </p>
                        ) : null}
                    </button>
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto shrink-0 gap-1.5 px-0 text-[12.5px] font-medium"
                        onClick={openEditor}
                    >
                        <Pencil className="size-3.5" aria-hidden />
                        {REQUEST_COPY.contactEdit}
                    </Button>
                </div>
            ) : (
                <div className="rounded-lg border border-border p-4">
                    <AddressFormFields
                        value={{
                            line1: value?.line1,
                            line2: value?.line2,
                            city: value?.city,
                            region: value?.region,
                            country: value?.country,
                            postalCode: value?.postalCode,
                            countryCode: value?.countryCode,
                            regionCode: value?.regionCode,
                        }}
                        onPatch={patch}
                    />
                </div>
            )}

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <AddressFormFields
                            value={{
                                line1: editDraft.line1,
                                line2: editDraft.line2,
                                city: editDraft.city,
                                region: editDraft.region,
                                country: editDraft.country,
                                postalCode: editDraft.postalCode,
                                countryCode: editDraft.countryCode,
                                regionCode: editDraft.regionCode,
                            }}
                            onPatch={(next) =>
                                setEditDraft((prev) =>
                                    normalizeAddress({
                                        ...prev,
                                        ...next,
                                    }),
                                )
                            }
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-sm"
                            onClick={() => setPickerOpen(false)}
                        >
                            {REQUEST_COPY.shippingAddressCancel}
                        </Button>
                        <Button
                            type="button"
                            className="rounded-sm"
                            disabled={!hasShippingLocation(editDraft)}
                            onClick={saveAddress}
                        >
                            {REQUEST_COPY.shippingAddressSave}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showSignInWhenSignedOut && !viewer ? (
                <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
            ) : null}
        </div>
    );
}
