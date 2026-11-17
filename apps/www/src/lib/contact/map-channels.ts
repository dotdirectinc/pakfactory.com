import type {
    ContactChannelDoc,
    ContactEnquiryField,
    ContactEnquiryScreen,
    PageSectionDoc,
} from '@pakfactory/sanity/queries';
import {
    resolveWwwNavHref,
    type WwwLinkHrefInput,
} from '@/lib/resolve-www-nav-href';
import {WWW_ROUTES} from '@/lib/www-routes';

/** Collect `contactChannel` rows from every `contactDirectory` section. */
export function collectContactChannelsFromSections(
    sections: PageSectionDoc[] | null | undefined,
): ContactChannelDoc[] {
    if (!sections?.length) return [];
    const out: ContactChannelDoc[] = [];
    for (const section of sections) {
        if (section._type !== 'contactDirectory') continue;
        // Narrow past PageSectionStubDoc (legacy `_type` string union).
        const channels =
            'channels' in section
                ? (section.channels as ContactChannelDoc[] | null | undefined)
                : null;
        for (const channel of channels ?? []) {
            if (channel?._key) out.push(channel);
        }
    }
    return out;
}

export type ContactChannelView =
    | {
          key: string;
          title: string;
          line: string;
          ctaLabel: string;
          kind: 'link';
          href: string;
          external: boolean;
      }
    | {
          key: string;
          title: string;
          line: string;
          ctaLabel: string;
          kind: 'chat';
      }
    | {
          key: string;
          title: string;
          line: string;
          ctaLabel: string;
          kind: 'enquiry';
          href: string;
          slug: string;
      };

export type ContactEnquiryFieldView = {
    key: string;
    kind: 'text' | 'email' | 'tel' | 'textarea' | 'choice';
    label: string;
    required: boolean;
    placeholder?: string;
    options?: {value: string; label: string; hint?: string}[];
};

export type ContactEnquiryScreenView = {
    key: string;
    heading: string;
    helper?: string;
    fields: ContactEnquiryFieldView[];
};

export type ContactEnquiryView = {
    key: string;
    title: string;
    slug: string;
    sendTo: 'support' | 'marketing' | 'sales';
    screens: ContactEnquiryScreenView[];
    sendLabel: string;
    sentTitle: string;
    sentBody: string;
};

function mapField(field: ContactEnquiryField): ContactEnquiryFieldView | null {
    const kind = field.kind?.trim();
    const label = field.label?.trim();
    if (!field._key || !label) return null;
    if (
        kind !== 'text' &&
        kind !== 'email' &&
        kind !== 'tel' &&
        kind !== 'textarea' &&
        kind !== 'choice'
    ) {
        return null;
    }
    const base: ContactEnquiryFieldView = {
        key: field._key,
        kind,
        label,
        required: field.required !== false,
    };
    if (kind === 'choice') {
        const options = (field.options ?? [])
            .map((o) => {
                const value = o.value?.trim();
                const optLabel = o.label?.trim();
                if (!value || !optLabel) return null;
                const hint = o.hint?.trim();
                return {
                    value,
                    label: optLabel,
                    ...(hint ? {hint} : {}),
                };
            })
            .filter((o): o is {value: string; label: string; hint?: string} =>
                Boolean(o),
            );
        if (options.length < 1) return null;
        return {...base, options};
    }
    const placeholder = field.placeholder?.trim();
    return placeholder ? {...base, placeholder} : base;
}

function mapScreen(screen: ContactEnquiryScreen): ContactEnquiryScreenView | null {
    const heading = screen.heading?.trim();
    if (!screen._key || !heading) return null;
    const fields = (screen.fields ?? [])
        .map(mapField)
        .filter((f): f is ContactEnquiryFieldView => Boolean(f));
    if (fields.length < 1) return null;
    const helper = screen.helper?.trim();
    return {
        key: screen._key,
        heading,
        ...(helper ? {helper} : {}),
        fields,
    };
}

export function mapContactEnquiry(
    channel: ContactChannelDoc,
): ContactEnquiryView | null {
    if (channel.action !== 'enquiry') return null;
    const slug = channel.enquirySlug?.trim();
    const title = channel.title?.trim();
    if (!channel._key || !slug || !title) return null;
    const sendToRaw = channel.sendTo?.trim();
    const sendTo =
        sendToRaw === 'marketing' || sendToRaw === 'sales'
            ? sendToRaw
            : 'support';
    const screens = (channel.screens ?? [])
        .map(mapScreen)
        .filter((s): s is ContactEnquiryScreenView => Boolean(s));
    if (screens.length < 1) return null;
    const sendLabel = channel.sendLabel?.trim() || 'Send';
    const sentTitle = channel.sentTitle?.trim() || 'Message sent';
    const sentBody =
        channel.sentBody?.trim() ||
        'Thanks! We will reply by email within 1–2 business days.';
    return {
        key: channel._key,
        title,
        slug,
        sendTo,
        screens,
        sendLabel,
        sentTitle,
        sentBody,
    };
}

export function mapContactChannels(
    channels: ContactChannelDoc[] | null | undefined,
): ContactChannelView[] {
    if (!channels?.length) return [];
    const out: ContactChannelView[] = [];
    for (const channel of channels) {
        const title = channel.title?.trim();
        const line = channel.line?.trim();
        const ctaLabel = channel.ctaLabel?.trim();
        if (!channel._key || !title || !line || !ctaLabel) continue;

        if (channel.action === 'chat') {
            out.push({key: channel._key, title, line, ctaLabel, kind: 'chat'});
            continue;
        }

        if (channel.action === 'enquiry') {
            const enquiry = mapContactEnquiry(channel);
            if (!enquiry) continue;
            out.push({
                key: channel._key,
                title,
                line,
                ctaLabel,
                kind: 'enquiry',
                href: contactEnquiryHref(enquiry.slug),
                slug: enquiry.slug,
            });
            continue;
        }

        if (channel.action === 'link') {
            const resolved = resolveWwwNavHref(
                channel.link as WwwLinkHrefInput | null | undefined,
            );
            if (!resolved) continue;
            out.push({
                key: channel._key,
                title,
                line,
                ctaLabel,
                kind: 'link',
                href: resolved.href,
                external: resolved.external,
            });
        }
    }
    return out;
}

export function findContactEnquiry(
    channels: ContactChannelDoc[] | null | undefined,
    slug: string,
): ContactEnquiryView | null {
    const needle = slug.trim();
    if (!needle || !channels?.length) return null;
    for (const channel of channels) {
        if (channel.enquirySlug?.trim() !== needle) continue;
        return mapContactEnquiry(channel);
    }
    return null;
}

export function contactEnquiryHref(slug: string): string {
    return `${WWW_ROUTES.contact}/${encodeURIComponent(slug)}`;
}

export function listContactEnquirySlugs(
    channels: ContactChannelDoc[] | null | undefined,
): string[] {
    if (!channels?.length) return [];
    return channels
        .map((c) =>
            c.action === 'enquiry' ? c.enquirySlug?.trim() || '' : '',
        )
        .filter(Boolean);
}

export type ContactEnquiryTopicOption = {
    slug: string;
    title: string;
};

/** Enquiry rows for the topic switcher (Link / Chat excluded). */
export function listContactEnquiryTopics(
    channels: ContactChannelDoc[] | null | undefined,
): ContactEnquiryTopicOption[] {
    if (!channels?.length) return [];
    const out: ContactEnquiryTopicOption[] = [];
    for (const channel of channels) {
        if (channel.action !== 'enquiry') continue;
        const slug = channel.enquirySlug?.trim();
        const title = channel.title?.trim();
        if (!slug || !title) continue;
        out.push({slug, title});
    }
    return out;
}
