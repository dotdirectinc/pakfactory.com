import type {PageSectionContactDirectoryDoc} from '@pakfactory/sanity/queries';
import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';
import {stegaClean} from 'next-sanity';

import {
    mapContactChannels,
    type ContactChannelView,
} from '@/lib/contact/map-channels';
import {CONTACT_FALLBACK} from '@/lib/contact/copy';
import {
    mapSectionChrome,
    type SectionAlign,
} from '@/lib/sections/map-section-chrome';

export type ContactDirectoryContent = {
    eyebrow?: string;
    heading: string;
    intro?: string;
    channels: ContactChannelView[];
    showLiveSupport: boolean;
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    paddingBlock: PageDielinePaddingBlock;
};

/** Map Sanity `contactDirectory` → Contact directory section props. */
export function mapContactDirectory(
    section: PageSectionContactDirectoryDoc,
): ContactDirectoryContent {
    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim() || CONTACT_FALLBACK.headline;
    const intro = section.intro?.trim() || CONTACT_FALLBACK.intro;
    // Unset Layout padding stays flush (hub default); explicit Studio values win.
    const rawPadding = stegaClean(section.paddingBlock);
    const paddingBlock: PageDielinePaddingBlock = rawPadding
        ? chrome.paddingBlock
        : 'none';

    return {
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        heading,
        intro,
        channels: mapContactChannels(section.channels),
        showLiveSupport: section.showLiveSupport !== false,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        paddingBlock,
    };
}
