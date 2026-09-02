'use client';

import {useState} from 'react';
import {MapPin} from 'lucide-react';
import {ProfileAddressFields} from '@/components/account/profile/profile-address-fields';
import {ProfileFormDialog} from '@/components/account/profile/profile-form-dialog';
import {ProfileSection} from '@/components/account/profile/profile-section';
import type {ProfileAddress} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileShippingAddressesSectionProps = {
    addresses: ProfileAddress[];
};

const EMPTY_ADDRESS: ProfileAddress = {
    id: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
};

export function ProfileShippingAddressesSection({
    addresses: initialAddresses,
}: ProfileShippingAddressesSectionProps) {
    const [open, setOpen] = useState(false);
    const [addresses, setAddresses] = useState(initialAddresses);
    const [draft, setDraft] = useState(EMPTY_ADDRESS);

    function openDialog() {
        setDraft({...EMPTY_ADDRESS, id: `ship-${Date.now()}`});
        setOpen(true);
    }

    return (
        <>
            <ProfileSection
                title={ACCOUNT_COPY.addressesTitle}
                actionLabel={ACCOUNT_COPY.add}
                onAction={openDialog}
            >
                {addresses.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {addresses.map((address) => (
                            <li
                                key={address.id}
                                className="flex items-start justify-between gap-4 px-4 py-3"
                            >
                                <div className="text-sm text-foreground">
                                    <p>{address.line1}</p>
                                    {address.line2 ? (
                                        <p>{address.line2}</p>
                                    ) : null}
                                    <p className="text-muted-foreground">
                                        {[
                                            address.city,
                                            address.region,
                                            address.postalCode,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {address.country}
                                    </p>
                                </div>
                                {address.isDefault ? (
                                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                        {ACCOUNT_COPY.defaultLabel}
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
                        <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/40">
                            <MapPin className="size-4" aria-hidden />
                        </span>
                        {ACCOUNT_COPY.noAddresses}
                    </div>
                )}
            </ProfileSection>

            <ProfileFormDialog
                open={open}
                onOpenChange={setOpen}
                title={ACCOUNT_COPY.addAddressTitle}
                onSave={() => {
                    if (!draft.line1.trim()) {
                        return;
                    }
                    setAddresses((prev) => [
                        ...prev,
                        {
                            ...draft,
                            isDefault: prev.length === 0,
                        },
                    ]);
                }}
            >
                <ProfileAddressFields
                    idPrefix="shipping-dialog"
                    value={draft}
                    onChange={setDraft}
                />
            </ProfileFormDialog>
        </>
    );
}
