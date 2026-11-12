'use client';

import {useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {ProfileFormDialog} from '@/components/account/profile/profile-form-dialog';
import {ProfileSection} from '@/components/account/profile/profile-section';
import {
    profileContactSchema,
    type ProfileContactValues,
} from '@/lib/account/profile-schemas';
import type {ProfileContact} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';

type ProfileContactSectionProps = {
    contact: ProfileContact;
};

export function ProfileContactSection({contact}: ProfileContactSectionProps) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(contact);
    const form = useForm<ProfileContactValues>({
        resolver: zodResolver(profileContactSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        values: saved,
    });

    function openDialog() {
        form.reset(saved);
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
                            <span className="text-sm text-muted-foreground">{label}</span>
                            <span className="text-sm text-foreground">{value}</span>
                        </div>
                    ))}
                </div>
            </ProfileSection>

            <ProfileFormDialog
                open={open}
                onOpenChange={setOpen}
                title={ACCOUNT_COPY.editContactTitle}
                onSave={async () => {
                    const ok = await form.trigger();
                    if (!ok) return false;
                    setSaved(form.getValues());
                }}
            >
                <Form {...form}>
                    <div className="flex flex-col gap-4">
                        {(
                            [
                                ['name', ACCOUNT_COPY.fieldName, false],
                                ['email', ACCOUNT_COPY.fieldEmail, true],
                                ['phone', ACCOUNT_COPY.fieldPhone, false],
                                ['company', ACCOUNT_COPY.fieldCompany, false],
                                ['industry', ACCOUNT_COPY.fieldIndustry, false],
                            ] as const
                        ).map(([key, label, readOnly]) => (
                            <FormField
                                key={key}
                                control={form.control}
                                name={key}
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-medium">
                                            {label}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                readOnly={readOnly}
                                                className="h-11 rounded-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                </Form>
            </ProfileFormDialog>
        </>
    );
}
