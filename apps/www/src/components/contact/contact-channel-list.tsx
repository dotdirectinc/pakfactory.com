'use client';

import {ChevronRight} from 'lucide-react';
import {ArrowLink} from '@/components/ui/arrow-link';
import {Icon} from '@/components/ui/icon';
import {openChat} from '@/lib/chat/open-chat';
import {CONTACT_FALLBACK} from '@/lib/contact/copy';
import type {ContactChannelView} from '@/lib/contact/map-channels';

type ContactChannelListProps = {
    channels: ContactChannelView[];
};

/** Right panel: one row per way to reach us from Studio. */
export function ContactChannelList({channels}: ContactChannelListProps) {
    if (channels.length === 0) {
        return (
            <p className="px-8 py-8 text-sm text-muted-foreground">
                Ways to reach us will appear here once a Contact directory
                section is added in Studio.
            </p>
        );
    }

    return (
        <div className="w-full">
            <h2 className="sr-only">{CONTACT_FALLBACK.channelsLabel}</h2>
            <ul>
                {channels.map((c) => (
                    <li
                        key={c.key}
                        className="flex flex-col gap-4 border-b border-dashed border-border px-8 py-8 sm:flex-row sm:items-center sm:gap-8"
                    >
                        <p className="text-xl font-medium leading-snug tracking-tight text-foreground sm:w-64 sm:shrink-0">
                            {c.title}
                        </p>
                        <p className="flex-1 text-sm leading-6 text-muted-foreground">
                            {c.line}
                        </p>
                        {c.kind === 'chat' ? (
                            <button
                                type="button"
                                onClick={openChat}
                                className="group inline-flex w-fit shrink-0 items-center gap-2 text-sm font-medium text-foreground sm:ml-auto"
                            >
                                <span className="underline-offset-4 group-hover:underline">
                                    {c.ctaLabel}
                                </span>
                                <Icon
                                    icon={ChevronRight}
                                    size="sm"
                                    className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                                />
                            </button>
                        ) : c.kind === 'link' && c.external ? (
                            <a
                                href={c.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex w-fit shrink-0 items-center gap-2 text-sm font-medium text-foreground sm:ml-auto"
                            >
                                <span className="underline-offset-4 group-hover:underline">
                                    {c.ctaLabel}
                                </span>
                                <Icon
                                    icon={ChevronRight}
                                    size="sm"
                                    className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                                />
                            </a>
                        ) : (
                            <ArrowLink
                                href={c.href}
                                size="sm"
                                className="sm:ml-auto"
                            >
                                {c.ctaLabel}
                            </ArrowLink>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
