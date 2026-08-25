'use client';

import {useState} from 'react';
import {MapPin} from 'lucide-react';
import {ProfileAddressFields} from '@/components/account/profile/profile-address-fields';
import {ProfileFormDialog} from '@/components/account/profile/profile-form-dialog';
import {ProfileSection} from '@/components/account/profile/profile-section';
import type {ProfileAddress} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileCompanyAddressSectionProps = {
    address: ProfileAddress | null;
};

const EMPTY_ADDRESS: ProfileAddress = {
    id: 'company',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
};

function formatAddress(address: ProfileAddress): string {
    return [
        address.line1,
        address.line2,
        [address.city, address.region, address.postalCode]
            .filter(Boolean)
            .join(', '),
        address.country,
    ]
        .filter(Boolean)
        .join(' · ');
}

export function ProfileCompanyAddressSection({
    address,
}: ProfileCompanyAddressSectionProps) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(address);
    const [draft, setDraft] = useState(address ?? EMPTY_ADDRESS);

    function openDialog() {
        setDraft(saved ?? EMPTY_ADDRESS);
        setOpen(true);
    }

    return (
        <>
            <ProfileSection
                title={ACCOUNT_COPY.companyAddressTitle}
                actionLabel={ACCOUNT_COPY.edit}
                onAction={openDialog}
            >
                {saved ? (
                    <div className="px-4 py-3 text-sm text-foreground">
                        {formatAddress(saved)}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
                        <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/40">
                            <MapPin className="size-4" aria-hidden />
                        </span>
                        {ACCOUNT_COPY.noCompanyAddress}
                    </div>
                )}
            </ProfileSection>

            <ProfileFormDialog
                open={open}
                onOpenChange={setOpen}
                title={ACCOUNT_COPY.editCompanyAddressTitle}
                onSave={() => setSaved({...draft, id: 'company'})}
            >
                <ProfileAddressFields
                    idPrefix="company-dialog"
                    value={draft}
                    onChange={setDraft}
                />
            </ProfileFormDialog>
        </>
    );
}
