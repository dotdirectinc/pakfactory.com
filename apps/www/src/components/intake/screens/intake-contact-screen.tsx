'use client';

import {useState} from 'react';
import {Pencil} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {AnnualSpendField} from '@/components/request/annual-spend-field';
import {REQUEST_COPY} from '@/lib/copy/request';
import {digitsOnlySpend, formatSpendLabel} from '@/lib/request/annual-spend';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestDraft} from '@/lib/request/request.storage';

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

    const fullName =
        `${draft.contactFirstName} ${draft.contactLastName}`.trim() || viewer?.email || '';
    const initials =
        `${draft.contactFirstName.charAt(0)}${draft.contactLastName.charAt(0)}`.trim().toUpperCase() ||
        (viewer?.email ?? '?').charAt(0).toUpperCase();
    const website = (draft.contactWebsite ?? '').trim();
    const phone = draft.contactPhone.trim();
    const spendDigits = digitsOnlySpend(draft.annualSpend ?? '');
    const spendLabel = spendDigits ? formatSpendLabel(spendDigits) : '';
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
        <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
                <Field id="intake-first-name" label={REQUEST_COPY.firstName}>
                    <Input
                        id="intake-first-name"
                        autoComplete="given-name"
                        className={FIELD_CLASS}
                        value={draft.contactFirstName}
                        onChange={(e) => onPatch({contactFirstName: e.target.value})}
                    />
                </Field>
                <Field id="intake-last-name" label={REQUEST_COPY.lastName}>
                    <Input
                        id="intake-last-name"
                        autoComplete="family-name"
                        className={FIELD_CLASS}
                        value={draft.contactLastName}
                        onChange={(e) => onPatch({contactLastName: e.target.value})}
                    />
                </Field>
            </div>
            <Field id="intake-email" label={REQUEST_COPY.workEmail} hint={viewer ? REQUEST_COPY.contactEmailLocked : undefined}>
                <Input
                    id="intake-email"
                    type="email"
                    autoComplete="email"
                    className={FIELD_CLASS}
                    value={draft.contactEmail}
                    // readOnly, not disabled: still focusable and announced (see StepYourInformation).
                    readOnly={Boolean(viewer)}
                    onChange={(e) => onPatch({contactEmail: e.target.value})}
                />
            </Field>
            {/* c98 (owner, Nov 2): phone, optional, between email and website. */}
            <Field id="intake-phone" label={REQUEST_COPY.intakePhoneLabel}>
                <Input
                    id="intake-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={FIELD_CLASS}
                    value={draft.contactPhone}
                    onChange={(e) => onPatch({contactPhone: e.target.value})}
                />
            </Field>
            <Field id="intake-website" label={REQUEST_COPY.intakeWebsiteLabel}>
                <Input
                    id="intake-website"
                    // type="text", not "url": the browser's URL check demands https://; a domain is enough (isValidWebsite).
                    type="text"
                    inputMode="url"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoComplete="url"
                    className={FIELD_CLASS}
                    placeholder={REQUEST_COPY.intakeWebsitePlaceholder}
                    value={draft.contactWebsite ?? ''}
                    onChange={(e) => onPatch({contactWebsite: e.target.value})}
                />
            </Field>
            <AnnualSpendField value={draft.annualSpend} onChange={(annualSpend) => onPatch({annualSpend})} />
        </div>
    );
}

function Field({id, label, hint, children}: {id: string; label: string; hint?: string; children: React.ReactNode}) {
    return (
        <div>
            <Label htmlFor={id} className="mb-1 block text-xs font-medium">
                {label}
                {hint ? <span className="ml-1 font-normal text-muted-foreground">· {hint}</span> : null}
            </Label>
            {children}
        </div>
    );
}
