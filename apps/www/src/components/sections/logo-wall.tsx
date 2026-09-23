import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {
    LogoMarquee,
    type LogoMarqueeItem,
} from '@/components/ui/logo-marquee';
import {SectionHeading} from '@/components/ui/section-heading';
import type {SolutionLogosContent} from '@/lib/solutions/types';

export type LogoWallContent = SolutionLogosContent;

type LogoWallProps = {
    content: LogoWallContent;
    /** DOM id for the sr-only heading when present. */
    headingId?: string;
};

function toLogoMarqueeItems(content: LogoWallContent): LogoMarqueeItem[] {
    return content.items.map((item) => ({
        id: item.id,
        name: item.name,
        imageSrc: item.imageSrc,
        href: item.href,
        linkLabel: item.linkLabel,
        width: item.width,
        height: item.height,
    }));
}

/**
 * Logo wall band — PageDielineSection + LogoMarquee (ADR-020 / WP2a).
 * Props-only; fixture + CMS paths share this component.
 */
export function LogoWall({
    content,
    headingId = 'logo-wall-heading',
}: LogoWallProps) {
    const items = toLogoMarqueeItems(content);
    if (items.length === 0) return null;

    const {
        align = 'left',
        borderTop = false,
        borderBottom = true,
        cta,
        subhead,
    } = content;

    return (
        <PageDielineSection
            as="section"
            aria-labelledby={content.heading ? headingId : undefined}
            className="bg-background"
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="pb-16 pt-16"
        >
            {content.heading ? (
                <h2 id={headingId} className="sr-only">
                    {content.heading}
                </h2>
            ) : null}
            {subhead || cta ? (
                <div className="mb-10">
                    <SectionHeading
                        title={<span className="sr-only">Partners</span>}
                        description={subhead}
                        descriptionClassName="max-w-[720px] text-[15px] leading-[1.5] text-muted-foreground"
                        align={align}
                        cta={cta}
                        ctaPlacement="end"
                    />
                </div>
            ) : null}
            <LogoMarquee items={items} />
        </PageDielineSection>
    );
}
