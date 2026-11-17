'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {zodResolver} from '@hookform/resolvers/zod';
import {CircleCheck} from 'lucide-react';
import {useForm, type Resolver} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {Form} from '@pakfactory/ui/components/form';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {SectionReveal} from '@/components/common/section-reveal';
import {EnquiryFieldControl} from '@/components/contact/enquiry-field-control';
import {PrivacyLine} from '@/components/request/review-consent';
import {RequestShell} from '@/components/request-sections/request-shell';
import {LeaveDialog} from '@/components/ui/leave-dialog';
import {CONTACT_FALLBACK} from '@/lib/contact/copy';
import {
    emptyEnquiryAnswers,
    enquiryFormSchema,
    flattenEnquiryFields,
    type ScreenAnswers,
} from '@/lib/contact/enquiry-schema';
import {
    contactEnquiryHref,
    type ContactEnquiryFieldView,
    type ContactEnquiryTopicOption,
    type ContactEnquiryView,
} from '@/lib/contact/map-channels';
import {submitEnquiry} from '@/lib/contact/submit-enquiry';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

type ContactEnquiryFlowProps = {
    enquiry: ContactEnquiryView;
    /** Other enquiry topics for the switcher (includes current). */
    topics: ContactEnquiryTopicOption[];
};

type EnquiryFieldRow =
    | {kind: 'full'; field: ContactEnquiryFieldView}
    | {kind: 'pair'; fields: [ContactEnquiryFieldView, ContactEnquiryFieldView]};

/** Short inputs can sit side-by-side; textarea/choice stay full width. */
function isShortEnquiryField(field: ContactEnquiryFieldView): boolean {
    return (
        field.kind === 'text' ||
        field.kind === 'email' ||
        field.kind === 'tel'
    );
}

/** Walk fields: pair consecutive short fields; leave textarea/choice full-span. */
function groupEnquiryFieldRows(
    fields: ContactEnquiryFieldView[],
): EnquiryFieldRow[] {
    const rows: EnquiryFieldRow[] = [];
    let i = 0;
    while (i < fields.length) {
        const current = fields[i]!;
        const next = fields[i + 1];
        if (
            isShortEnquiryField(current) &&
            next &&
            isShortEnquiryField(next)
        ) {
            rows.push({kind: 'pair', fields: [current, next]});
            i += 2;
            continue;
        }
        rows.push({kind: 'full', field: current});
        i += 1;
    }
    return rows;
}

type EnquiryHeadingMode = 'none' | 'description' | 'heading';

function normalizeEnquiryLabel(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Sole field matching heading → hide.
 * Multi-field with a matching field label → muted description (not H2).
 * Otherwise → group H2 (e.g. Contact information).
 */
function enquiryScreenHeadingMode(
    heading: string,
    fields: ContactEnquiryFieldView[],
): EnquiryHeadingMode {
    const normalized = normalizeEnquiryLabel(heading);
    const match = fields.some(
        (field) => normalizeEnquiryLabel(field.label) === normalized,
    );
    if (fields.length === 1 && match) return 'none';
    if (fields.length > 1 && match) return 'description';
    return 'heading';
}

/**
 * Single-page Contact enquiry: all Studio fields flattened into one form, with
 * a topic Select to switch `/contact/[slug]`. Confirm-only submit until Desk /
 * CRM delivery lands.
 */
export function ContactEnquiryFlow({enquiry, topics}: ContactEnquiryFlowProps) {
    const router = useRouter();
    const {viewer} = useRequest();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const prefilled = useRef(false);

    const fields = useMemo(
        () => flattenEnquiryFields(enquiry.screens),
        [enquiry.screens],
    );
    const schema = useMemo(
        () => enquiryFormSchema(enquiry.screens),
        [enquiry.screens],
    );
    const form = useForm<ScreenAnswers>({
        resolver: zodResolver(schema) as unknown as Resolver<ScreenAnswers>,
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: emptyEnquiryAnswers(enquiry.screens),
    });

    useEffect(() => {
        prefilled.current = false;
        form.reset(emptyEnquiryAnswers(enquiry.screens));
        setSent(false);
        setError(null);
    }, [enquiry.slug, enquiry.screens, form]);

    useEffect(() => {
        if (prefilled.current || !viewer) return;
        prefilled.current = true;
        const patch: Record<string, string> = {};
        for (const field of fields) {
            const label = field.label.toLowerCase();
            if (
                (label.includes('first name') || label === 'first name') &&
                viewer.firstName
            ) {
                patch[field.key] = viewer.firstName;
            }
            if (
                (label.includes('last name') || label === 'last name') &&
                viewer.lastName
            ) {
                patch[field.key] = viewer.lastName;
            }
            if (field.kind === 'email' && viewer.email) {
                patch[field.key] = viewer.email;
            }
        }
        if (Object.keys(patch).length) {
            for (const [key, value] of Object.entries(patch)) {
                form.setValue(key, value, {shouldDirty: false});
            }
        }
    }, [viewer, fields, form, enquiry.slug]);

    async function onSubmit(values: ScreenAnswers) {
        if (pending) return;
        setPending(true);
        setError(null);
        try {
            await submitEnquiry({
                slug: enquiry.slug,
                sendTo: enquiry.sendTo,
                answers: values,
            });
            setSent(true);
        } catch {
            setError(CONTACT_FALLBACK.sendError);
        } finally {
            setPending(false);
        }
    }

    function leave() {
        const values = form.getValues();
        const dirty = Object.values(values).some((v) => String(v ?? '').trim());
        if (dirty && !sent) setConfirmLeave(true);
        else router.push(WWW_ROUTES.contact);
    }

    function onTopicChange(slug: string) {
        if (!slug || slug === enquiry.slug) return;
        router.push(contactEnquiryHref(slug));
    }

    if (sent) {
        return (
            <RequestShell
                title={enquiry.title}
                onClose={() => router.push(WWW_ROUTES.contact)}
            >
                <SectionReveal className="flex flex-1 flex-col">
                    <PageHeadingSection
                        align="center"
                        title={enquiry.sentTitle}
                        description={enquiry.sentBody}
                    />
                    <PageDielineSection
                        paddingBlock="none"
                        flush
                        borderBottom
                        className="flex flex-1 flex-col"
                        innerClassName="flex min-h-full flex-1 flex-col"
                    >
                        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-layout-gutter-inner py-16">
                            <CircleCheck
                                className="size-10 text-foreground"
                                aria-hidden
                            />
                            <Button asChild variant="outline" className="w-fit">
                                <Link href={WWW_ROUTES.contact}>
                                    {CONTACT_FALLBACK.backToContact}
                                </Link>
                            </Button>
                        </div>
                    </PageDielineSection>
                </SectionReveal>
            </RequestShell>
        );
    }

    return (
        <>
            <RequestShell title={enquiry.title} onClose={leave}>
                <SectionReveal className="flex flex-1 flex-col">
                    <PageHeadingSection
                        align="center"
                        eyebrow={CONTACT_FALLBACK.enquiryEyebrow}
                        title={enquiry.title}
                    />
                    <PageDielineSection
                        paddingBlock="none"
                        flush
                        borderBottom
                        className="flex flex-1 flex-col"
                        innerClassName="flex min-h-full flex-1 flex-col"
                    >
                        <div className="mx-auto w-full max-w-5xl px-layout-gutter-inner py-12">
                            <Form {...form}>
                                <form
                                    className="flex w-full flex-col gap-10"
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    noValidate
                                >
                                    {topics.length > 1 ? (
                                        <div className="flex flex-col gap-2">
                                            <h2
                                                id="enquiry-topic-heading"
                                                className="text-sm font-medium text-foreground"
                                            >
                                                {CONTACT_FALLBACK.topicLabel}
                                            </h2>
                                            <Select
                                                value={enquiry.slug}
                                                onValueChange={onTopicChange}
                                            >
                                                <SelectTrigger
                                                    id="enquiry-topic"
                                                    aria-labelledby="enquiry-topic-heading"
                                                    className="h-11 w-full rounded-sm bg-background text-sm"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {topics.map((topic) => (
                                                        <SelectItem
                                                            key={topic.slug}
                                                            value={topic.slug}
                                                        >
                                                            {topic.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : null}

                                    {enquiry.screens.map((screen) => {
                                        const rows = groupEnquiryFieldRows(
                                            screen.fields,
                                        );
                                        const headingMode =
                                            enquiryScreenHeadingMode(
                                                screen.heading,
                                                screen.fields,
                                            );
                                        const headingNorm =
                                            normalizeEnquiryLabel(
                                                screen.heading,
                                            );
                                        return (
                                            <div
                                                key={screen.key}
                                                className="flex flex-col gap-4"
                                            >
                                                {headingMode === 'heading' ? (
                                                    <h2 className="text-sm font-medium text-foreground">
                                                        {screen.heading}
                                                    </h2>
                                                ) : null}
                                                {headingMode ===
                                                'description' ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        {screen.heading}
                                                    </p>
                                                ) : null}
                                                <div className="grid gap-6 sm:grid-cols-2">
                                                    {rows.map((row) =>
                                                        row.kind === 'pair' ? (
                                                            <div
                                                                key={row.fields
                                                                    .map(
                                                                        (f) =>
                                                                            f.key,
                                                                    )
                                                                    .join('-')}
                                                                className="contents"
                                                            >
                                                                {row.fields.map(
                                                                    (field) => (
                                                                        <EnquiryFieldControl
                                                                            key={
                                                                                field.key
                                                                            }
                                                                            field={
                                                                                field
                                                                            }
                                                                            control={
                                                                                form.control
                                                                            }
                                                                            hideLabel={
                                                                                headingMode ===
                                                                                    'description' &&
                                                                                normalizeEnquiryLabel(
                                                                                    field.label,
                                                                                ) ===
                                                                                    headingNorm
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div
                                                                key={
                                                                    row.field
                                                                        .key
                                                                }
                                                                className="sm:col-span-2"
                                                            >
                                                                <EnquiryFieldControl
                                                                    field={
                                                                        row.field
                                                                    }
                                                                    control={
                                                                        form.control
                                                                    }
                                                                    hideLabel={
                                                                        headingMode ===
                                                                            'description' &&
                                                                        normalizeEnquiryLabel(
                                                                            row
                                                                                .field
                                                                                .label,
                                                                        ) ===
                                                                            headingNorm
                                                                    }
                                                                />
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="flex flex-col gap-4 border-t border-border pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                                        <div className="order-1 flex min-w-0 flex-1 flex-col gap-2 sm:order-none">
                                            {error ? (
                                                <p
                                                    className="text-sm text-destructive"
                                                    role="alert"
                                                >
                                                    {error}
                                                </p>
                                            ) : null}
                                            <PrivacyLine
                                                purpose={
                                                    CONTACT_FALLBACK.privacyPurpose
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            size="xl"
                                            className="order-2 h-14 w-full shrink-0 px-10 text-lg sm:order-none sm:w-auto"
                                            disabled={pending}
                                        >
                                            {pending
                                                ? CONTACT_FALLBACK.submitting
                                                : CONTACT_FALLBACK.submit}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </PageDielineSection>
                </SectionReveal>
            </RequestShell>
            <LeaveDialog
                open={confirmLeave}
                title={CONTACT_FALLBACK.leaveTitle}
                description={CONTACT_FALLBACK.leaveBody}
                onCancel={() => setConfirmLeave(false)}
                discardLabel={CONTACT_FALLBACK.leaveDiscard}
                onDiscard={() => router.push(WWW_ROUTES.contact)}
            />
        </>
    );
}
