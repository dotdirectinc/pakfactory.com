import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ContactChannelList} from '@/components/contact/contact-channel-list';
import {ContactDetails} from '@/components/contact/contact-details';
import type {ContactChannelView} from '@/lib/contact/map-channels';
import type {WwwGlobalSettings} from '@/lib/www-global-settings';

type ContactDirectoryProps = {
    settings: WwwGlobalSettings | null;
    channels: ContactChannelView[];
    showLiveSupport?: boolean;
    heading?: string;
    intro?: string;
    borderTop?: boolean;
    borderBottom?: boolean;
    /** Studio Layout → Vertical padding (default none keeps hub flush). */
    paddingBlock?: PageDielinePaddingBlock;
    sectionId?: string;
};

/**
 * Contact hub: optional page heading, then live-support + channel rows inside
 * PageDielineSection. Left rail is muted, right column is white — no whole-band
 * theme. Padding/borders come from Studio Layout on the section.
 */
export function ContactDirectory({
    settings,
    channels,
    showLiveSupport = true,
    heading,
    intro,
    borderTop = true,
    borderBottom = true,
    paddingBlock = 'none',
    sectionId,
}: ContactDirectoryProps) {
    return (
        <>
            {heading ? (
                <PageHeadingSection title={heading} description={intro} />
            ) : null}
            <PageDielineSection
                id={sectionId}
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock={paddingBlock}
                flush
            >
                <div className="flex w-full flex-col items-stretch lg:flex-row">
                    {showLiveSupport ? (
                        <ContactDetails settings={settings} />
                    ) : null}
                    <div className="order-1 min-w-0 flex-1 self-stretch bg-background lg:order-2">
                        <ContactChannelList channels={channels} />
                    </div>
                </div>
            </PageDielineSection>
        </>
    );
}
