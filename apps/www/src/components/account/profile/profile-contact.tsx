'use client';

import {useState} from 'react';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {ProfileFormDialog} from '@/components/account/profile/profile-form-dialog';
import {ProfileSection} from '@/components/account/profile/profile-section';
import type {ProfileContact} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileContactSectionProps = {
    contact: ProfileContact;
};

export function ProfileContactSection({contact}: ProfileContactSectionProps) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(contact);
    const [draft, setDraft] = useState(contact);

    function openDialog() {
        setDraft(saved);
        setOpen(true);
    }

    return (
        <>
            <ProfileSection
                title={ACCOUNT_COPY.contactTitle}
                actionLabel={ACCOUNT_COPY.edit}
                onAction={openDialog}
            >
                <div className="divide-y divide-border">
                    {(
                        [
                            [ACCOUNT_COPY.fieldName, saved.name],
                            [ACCOUNT_COPY.fieldEmail, saved.email],
                            [ACCOUNT_COPY.fieldPhone, saved.phone],
                            [ACCOUNT_COPY.fieldCompany, saved.company],
                            [ACCOUNT_COPY.fieldIndustry, saved.industry],
                        ] as const
                    ).map(([label, value]) => (
                        <div
                            key={label}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                            <span className="text-sm text-muted-foreground">
                                {label}
                            </span>
                            <span className="text-sm text-foreground">
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
            </ProfileSection>

            <ProfileFormDialog
                open={open}
                onOpenChange={setOpen}
                title={ACCOUNT_COPY.editContactTitle}
                onSave={() => setSaved(draft)}
            >
                {(
                    [
                        ['name', ACCOUNT_COPY.fieldName, false],
                        ['email', ACCOUNT_COPY.fieldEmail, true],
                        ['phone', ACCOUNT_COPY.fieldPhone, false],
                        ['company', ACCOUNT_COPY.fieldCompany, false],
                        ['industry', ACCOUNT_COPY.fieldIndustry, false],
                    ] as const
                ).map(([key, label, readOnly]) => (
                    <div key={key} className="flex flex-col gap-2">
                        <Label
                            htmlFor={`profile-dialog-${key}`}
                            className="text-xs font-medium"
                        >
                            {label}
                        </Label>
                        <Input
                            id={`profile-dialog-${key}`}
                            value={draft[key]}
                            readOnly={readOnly}
                            onChange={(event) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                }))
                            }
                            className="h-11 rounded-sm"
                        />
                    </div>
                ))}
            </ProfileFormDialog>
        </>
    );
}
