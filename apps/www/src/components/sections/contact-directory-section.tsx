import {ContactDirectory} from '@/components/contact/contact-directory';
import type {ContactDirectoryContent} from '@/lib/sections/map-contact-directory';
import type {WwwGlobalSettings} from '@/lib/www-global-settings';

type ContactDirectorySectionProps = ContactDirectoryContent & {
    settings: WwwGlobalSettings | null;
    sectionId?: string;
};

/** Studio `contactDirectory` — RSC shell around the Contact hub UI. */
export function ContactDirectorySection({
    settings,
    sectionId,
    heading,
    intro,
    channels,
    showLiveSupport,
    borderTop,
    borderBottom,
    paddingBlock,
}: ContactDirectorySectionProps) {
    return (
        <ContactDirectory
            settings={settings}
            channels={channels}
            showLiveSupport={showLiveSupport}
            heading={heading}
            intro={intro}
            borderTop={borderTop}
            borderBottom={borderBottom}
            paddingBlock={paddingBlock}
            sectionId={sectionId}
        />
    );
}
