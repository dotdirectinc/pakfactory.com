'use client';

import {useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Pencil} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {AnnualSpendField} from '@/components/request/annual-spend-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    digitsOnlySpend,
    formatSpendLabel,
    resolveAnnualSpendCurrency,
} from '@/lib/request/annual-spend';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestDraft} from '@/lib/request/request.storage';
import {
    contactIntakeFromDraft,
    contactIntakeSchema,
    type ContactIntakeValues,
} from '@/lib/request/schemas/contact';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

/**
 * Contact on the step intake (owner Nov 2): first and last name and email are needed; phone (c98),
 * company website, and yearly packaging spend are optional — no asterisks.
 * Signed in (owner Nov 3): summary card like Brief Builder v1; Edit opens the fields. Email from the account
 * can't be changed here.
 */
export function IntakeContactScreen({
    draft,
    onPatch,
    showReplyNote = true,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    /** sectioned request turns this off — privacy line on Submit covers it. Default on for Current. */
    showReplyNote?: boolean;
}) {
    const {viewer} = useRequest();
    const [editing, setEditing] = useState(false);
    const collapsed = Boolean(viewer) && !editing;

    const form = useForm<ContactIntakeValues>({
        resolver: zodResolver(contactIntakeSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        values: contactIntakeFromDraft(draft),
    });

    const fullName =
        `${draft.contactFirstName} ${draft.contactLastName}`.trim() || viewer?.email || '';
    const initials =
        `${draft.contactFirstName.charAt(0)}${draft.contactLastName.charAt(0)}`.trim().toUpperCase() ||
        (viewer?.email ?? '?').charAt(0).toUpperCase();
    const website = (draft.contactWebsite ?? '').trim();
    const phone = draft.contactPhone.trim();
    const spendDigits = digitsOnlySpend(draft.annualSpend ?? '');
    const spendCurrency =
        resolveAnnualSpendCurrency(draft.annualSpend, draft.annualSpendCurrency) ?? 'USD';
    const spendLabel = spendDigits ? formatSpendLabel(spendDigits, spendCurrency) : '';
    const detailLine = [draft.contactEmail, phone || null, spendLabel || null].filter(Boolean).join(' · ');

    if (collapsed) {
        return (
            <div>
                <div className="flex items-center gap-4 rounded-md border border-border bg-muted/40 p-4">
                    <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary"
                        aria-hidden
                    >
                        {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                        {detailLine ? (
                            <p className="truncate text-[13px] text-muted-foreground">{detailLine}</p>
                        ) : null}
                        {website ? (
                            <p className="truncate text-[13px] text-muted-foreground">{website}</p>
                        ) : null}
                    </div>
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto shrink-0 gap-1 px-0 text-[12.5px] font-medium"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="size-3.5" aria-hidden />
                        {REQUEST_COPY.contactEdit}
                    </Button>
                </div>
                {showReplyNote ? (
                    <p className="mt-2.5 px-0.5 text-[12.5px] text-muted-foreground">{REQUEST_COPY.contactReplyNote}</p>
                ) : null}
            </div>
        );
    }

    return (
        <Form {...form}>
            <div className="flex flex-col gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="contactFirstName"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium">{REQUEST_COPY.firstName}</FormLabel>
                                <FormControl>
                                    <Input
                                        autoComplete="given-name"
                                        className={FIELD_CLASS}
                                        placeholder={REQUEST_COPY.firstNamePlaceholder}
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onPatch({contactFirstName: e.target.value});
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactLastName"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium">{REQUEST_COPY.lastName}</FormLabel>
                                <FormControl>
                                    <Input
                                        autoComplete="family-name"
                                        className={FIELD_CLASS}
                                        placeholder={REQUEST_COPY.lastNamePlaceholder}
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onPatch({contactLastName: e.target.value});
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">
                                {REQUEST_COPY.workEmail}
                                {viewer ? (
                                    <span className="ml-1 font-normal text-muted-foreground">
                                        · {REQUEST_COPY.contactEmailLocked}
                                    </span>
                                ) : null}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    className={FIELD_CLASS}
                                    placeholder={REQUEST_COPY.workEmailPlaceholder}
                                    // readOnly, not disabled: still focusable and announced (see StepYourInformation).
                                    readOnly={Boolean(viewer)}
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        onPatch({contactEmail: e.target.value});
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">{REQUEST_COPY.intakePhoneLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    className={FIELD_CLASS}
                                    placeholder={REQUEST_COPY.intakePhonePlaceholder}
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        onPatch({contactPhone: e.target.value});
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="contactWebsite"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">{REQUEST_COPY.intakeWebsiteLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    // type="text", not "url": the browser's URL check demands https://; a domain is enough.
                                    type="text"
                                    inputMode="url"
                                    spellCheck={false}
                                    autoCapitalize="none"
                                    autoComplete="url"
                                    className={FIELD_CLASS}
                                    placeholder={REQUEST_COPY.intakeWebsitePlaceholder}
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        onPatch({contactWebsite: e.target.value});
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <AnnualSpendField
                    value={draft.annualSpend}
                    currency={spendCurrency}
                    onChange={(annualSpend) => onPatch({annualSpend})}
                    onCurrencyChange={(annualSpendCurrency) => onPatch({annualSpendCurrency})}
                />
            </div>
        </Form>
    );
}
